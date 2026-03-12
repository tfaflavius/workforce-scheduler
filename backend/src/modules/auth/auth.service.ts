import { Injectable, UnauthorizedException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { User, UserRole } from '../users/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { SupabaseService } from '../../common/supabase/supabase.service';
import { EmailService } from '../../common/email/email.service';
import { BCRYPT_SALT_ROUNDS } from '../../common/constants/security';

/** Max failed login attempts before account lockout */
const MAX_LOGIN_ATTEMPTS = 5;
/** Lockout duration in minutes */
const LOCKOUT_DURATION_MINUTES = 15;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  async register(registerDto: RegisterDto) {
    // Prevent self-assignment of privileged roles during registration
    // Only USER role is allowed for self-registration
    if (registerDto.role && registerDto.role !== UserRole.USER) {
      throw new ForbiddenException('Nu te poti inregistra cu un rol privilegiat. Contacteaza un administrator.');
    }

    // Check if user already exists in our DB
    const existingUser = await this.userRepository.findOne({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new BadRequestException('Un utilizator cu acest email exista deja');
    }

    try {
      // Create user in Supabase Auth (will send confirmation email)
      const supabaseUser = await this.supabaseService.signUp(
        registerDto.email,
        registerDto.password,
        {
          fullName: registerDto.fullName,
          role: registerDto.role,
        }
      );

      // Create user in our database with Supabase ID
      // isActive: false - requires admin approval
      // emailVerified: false - requires email confirmation
      const user = this.userRepository.create({
        id: supabaseUser.user.id, // Use Supabase user ID
        email: registerDto.email,
        password: '', // No password stored locally
        fullName: registerDto.fullName,
        phone: registerDto.phone,
        role: registerDto.role,
        departmentId: registerDto.departmentId,
        isActive: false, // Requires admin approval
        emailVerified: false, // Requires email confirmation
      });

      await this.userRepository.save(user);

      // Don't auto-login - user needs admin approval first
      return {
        message: 'Cont creat cu succes! Un administrator va aproba contul tau in curand.',
        user: this.sanitizeUser(user),
        requiresAdminApproval: true,
      };
    } catch (error) {
      throw new BadRequestException(error.message || 'Eroare la crearea utilizatorului');
    }
  }

  async login(loginDto: LoginDto) {
    // Get user from our database first
    const user = await this.userRepository.findOne({
      where: { email: loginDto.email },
      relations: ['department'],
    });

    if (!user) {
      throw new UnauthorizedException('Credentiale invalide');
    }

    // Check if user is approved by admin
    if (!user.isActive) {
      throw new UnauthorizedException('Contul tau asteapta aprobarea unui administrator. Vei primi acces in curand.');
    }

    // Check account lockout
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      this.logger.warn(`[Login] Account locked for ${loginDto.email}. ${minutesLeft} minutes remaining.`);
      throw new UnauthorizedException(
        `Contul este blocat temporar dupa prea multe incercari esuate. Incearca din nou in ${minutesLeft} minute.`,
      );
    }

    // Try Supabase authentication first (primary)
    try {
      const loginResult = await this.supabaseService.signIn(
        loginDto.email,
        loginDto.password,
      );

      // Reset failed attempts on successful login
      if (user.failedLoginAttempts > 0 || user.lockedUntil) {
        user.failedLoginAttempts = 0;
        user.lockedUntil = null;
      }

      // Update last login
      user.lastLogin = new Date();
      await this.userRepository.save(user);

      return {
        user: this.sanitizeUser(user),
        accessToken: loginResult.session.access_token,
      };
    } catch (supabaseError) {
      this.logger.log(`[Login] Supabase auth failed for ${loginDto.email}: ${supabaseError?.message}. Trying local password...`);

      // Fallback: check local password (useful after password reset if Supabase sync failed)
      if (user.password && user.password.length > 0) {
        const isLocalPasswordValid = await bcrypt.compare(loginDto.password, user.password);
        if (isLocalPasswordValid) {
          this.logger.log(`[Login] Local password matched for ${loginDto.email}. Syncing to Supabase...`);

          // Reset failed attempts on successful login
          if (user.failedLoginAttempts > 0 || user.lockedUntil) {
            user.failedLoginAttempts = 0;
            user.lockedUntil = null;
          }

          // Sync password to Supabase so future logins work directly
          try {
            await this.supabaseService.updateUserPassword(user.id, loginDto.password);
            this.logger.log(`[Login] Supabase password synced for ${loginDto.email}`);
          } catch (syncErr) {
            this.logger.error(`[Login] Supabase password sync failed: ${syncErr?.message}`);
          }

          // Now login with Supabase (should work after sync)
          try {
            const loginResult = await this.supabaseService.signIn(
              loginDto.email,
              loginDto.password,
            );

            user.lastLogin = new Date();
            await this.userRepository.save(user);

            return {
              user: this.sanitizeUser(user),
              accessToken: loginResult.session.access_token,
            };
          } catch (retryErr) {
            this.logger.error(`[Login] Supabase login retry failed after sync: ${retryErr?.message}`);
            throw new UnauthorizedException('Credentiale invalide');
          }
        }
      }

      // Increment failed login attempts
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= MAX_LOGIN_ATTEMPTS) {
        user.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000);
        this.logger.warn(`[Login] Account locked for ${loginDto.email} after ${user.failedLoginAttempts} failed attempts. Locked until ${user.lockedUntil.toISOString()}`);
      }
      await this.userRepository.save(user);

      throw new UnauthorizedException('Credentiale invalide');
    }
  }

  async validateUser(token: string): Promise<User> {
    try {
      // Verify token with Supabase
      const supabaseUser = await this.supabaseService.getUser(token);

      // Get user from our database
      const user = await this.userRepository.findOne({
        where: { id: supabaseUser.id },
        relations: ['department'],
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('Utilizatorul nu a fost gasit sau este inactiv');
      }

      return user;
    } catch (error) {
      throw new UnauthorizedException('Token invalid');
    }
  }

  async getMe(token: string) {
    const user = await this.validateUser(token);
    return this.sanitizeUser(user);
  }

  async forgotPassword(email: string) {
    const successMessage = 'Daca adresa de email exista in sistem, vei primi un link de resetare a parolei.';

    // Verifica daca userul exista in DB
    const user = await this.userRepository.findOne({ where: { email } });
    // Nu dezvăluim dacă emailul există sau nu (securitate)
    if (!user) {
      this.logger.log(`[ForgotPassword] Email not found in DB: ${email}`);
      return { message: successMessage };
    }

    try {
      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'https://workforce.lat';
      const jwtSecret = this.configService.get<string>('JWT_SECRET');
      const resendKey = this.configService.get<string>('RESEND_API_KEY');

      this.logger.log(`[ForgotPassword] Config check - JWT_SECRET: ${jwtSecret ? 'SET' : 'MISSING'}, RESEND_API_KEY: ${resendKey ? 'SET' : 'MISSING'}, FRONTEND_URL: ${frontendUrl}`);

      if (!jwtSecret) {
        this.logger.error('[ForgotPassword] JWT_SECRET is not configured! Cannot generate reset token.');
        return { message: successMessage };
      }

      this.logger.log(`[ForgotPassword] Generating reset token for ${email} (user: ${user.fullName})`);

      // Generate a password reset JWT token (1 hour expiry)
      const resetToken = jwt.sign(
        { userId: user.id, email: user.email, purpose: 'password-reset' },
        jwtSecret,
        { expiresIn: '1h' },
      );

      const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;
      this.logger.log(`[ForgotPassword] Reset URL: ${frontendUrl}/reset-password?token=<token>`);

      // Send password reset email via our own email service
      const emailSent = await this.emailService.sendPasswordResetEmail({
        employeeEmail: user.email,
        employeeName: user.fullName,
        resetUrl,
      });

      this.logger.log(`[ForgotPassword] Email send result for ${email}: ${emailSent ? 'SUCCESS' : 'FAILED (check RESEND_API_KEY and Resend domain verification)'}`);

      if (!emailSent) {
        this.logger.error(`[ForgotPassword] Email FAILED for ${email}. Possible causes: RESEND_API_KEY missing/invalid, domain not verified in Resend, or Resend service error.`);
      }
    } catch (error) {
      this.logger.error('[ForgotPassword] Error:', error?.message || error);
    }

    return { message: successMessage };
  }

  async resetPassword(resetToken: string, newPassword: string) {
    const jwtSecret = this.configService.get<string>('JWT_SECRET');

    // Verify our JWT reset token
    let payload: any;
    try {
      payload = jwt.verify(resetToken, jwtSecret);
    } catch (error) {
      this.logger.error('[ResetPassword] JWT verify failed:', error?.message);
      throw new BadRequestException('Link-ul de resetare a expirat sau este invalid. Te rugam sa soliciti un nou link.');
    }

    if (payload.purpose !== 'password-reset' || !payload.userId) {
      this.logger.error('[ResetPassword] Invalid token payload:', JSON.stringify(payload));
      throw new BadRequestException('Token invalid.');
    }

    this.logger.log(`[ResetPassword] Token valid for userId: ${payload.userId}, email: ${payload.email}`);

    const user = await this.userRepository.findOne({ where: { id: payload.userId } });
    if (!user) {
      this.logger.error(`[ResetPassword] User not found in DB for id: ${payload.userId}`);
      throw new BadRequestException('Utilizatorul nu a fost gasit.');
    }

    this.logger.log(`[ResetPassword] User found: ${user.fullName} (${user.email}), updating password...`);

    // 1. Update hashed password in local DB first (this always works)
    user.password = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);
    await this.userRepository.save(user);
    this.logger.log(`[ResetPassword] Local DB password updated for ${user.email}`);

    // 2. Update password in Supabase (non-blocking - login will use Supabase)
    try {
      await this.supabaseService.updateUserPassword(user.id, newPassword);
      this.logger.log(`[ResetPassword] Supabase password updated for ${user.email}`);
    } catch (error) {
      // Log the error but don't fail - we'll handle Supabase sync on next login
      this.logger.error(`[ResetPassword] Supabase password update failed for ${user.email}: ${error?.message || error}`);
      this.logger.error(`[ResetPassword] Full error: ${JSON.stringify(error, null, 2)}`);
    }

    return { message: 'Parola a fost resetata cu succes!' };
  }

  private sanitizeUser(user: User) {
    const { password, ...sanitized } = user;
    return sanitized;
  }
}
