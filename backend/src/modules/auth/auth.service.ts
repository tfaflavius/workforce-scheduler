import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { User } from '../users/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { SupabaseService } from '../../common/supabase/supabase.service';
import { EmailService } from '../../common/email/email.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  async register(registerDto: RegisterDto) {
    // Check if user already exists in our DB
    const existingUser = await this.userRepository.findOne({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
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
      throw new BadRequestException(error.message || 'Failed to create user');
    }
  }

  async login(loginDto: LoginDto) {
    try {
      // Authenticate with Supabase
      const loginResult = await this.supabaseService.signIn(
        loginDto.email,
        loginDto.password
      );

      // Get user from our database
      const user = await this.userRepository.findOne({
        where: { email: loginDto.email },
        relations: ['department'],
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Check if user is approved by admin
      if (!user.isActive) {
        throw new UnauthorizedException('Contul tau asteapta aprobarea unui administrator. Vei primi acces in curand.');
      }

      // Update last login
      user.lastLogin = new Date();
      await this.userRepository.save(user);

      return {
        user: this.sanitizeUser(user),
        accessToken: loginResult.session.access_token,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid credentials');
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
        throw new UnauthorizedException('User not found or inactive');
      }

      return user;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
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
      console.log(`[ForgotPassword] Email not found in DB: ${email}`);
      return { message: successMessage };
    }

    try {
      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'https://workforce.lat';
      const jwtSecret = this.configService.get<string>('JWT_SECRET');
      const resendKey = this.configService.get<string>('RESEND_API_KEY');

      console.log(`[ForgotPassword] Config check - JWT_SECRET: ${jwtSecret ? 'SET' : 'MISSING'}, RESEND_API_KEY: ${resendKey ? 'SET' : 'MISSING'}, FRONTEND_URL: ${frontendUrl}`);

      if (!jwtSecret) {
        console.error('[ForgotPassword] JWT_SECRET is not configured! Cannot generate reset token.');
        return { message: successMessage };
      }

      console.log(`[ForgotPassword] Generating reset token for ${email} (user: ${user.fullName})`);

      // Generate a password reset JWT token (1 hour expiry)
      const resetToken = jwt.sign(
        { userId: user.id, email: user.email, purpose: 'password-reset' },
        jwtSecret,
        { expiresIn: '1h' },
      );

      const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;
      console.log(`[ForgotPassword] Reset URL: ${frontendUrl}/reset-password?token=<token>`);

      // Send password reset email via our own email service
      const emailSent = await this.emailService.sendPasswordResetEmail({
        employeeEmail: user.email,
        employeeName: user.fullName,
        resetUrl,
      });

      console.log(`[ForgotPassword] Email send result for ${email}: ${emailSent ? 'SUCCESS' : 'FAILED (check RESEND_API_KEY and Resend domain verification)'}`);

      if (!emailSent) {
        console.error(`[ForgotPassword] Email FAILED for ${email}. Possible causes: RESEND_API_KEY missing/invalid, domain not verified in Resend, or Resend service error.`);
      }
    } catch (error) {
      console.error('[ForgotPassword] Error:', error?.message || error);
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
      throw new BadRequestException('Link-ul de resetare a expirat sau este invalid. Te rugam sa soliciti un nou link.');
    }

    if (payload.purpose !== 'password-reset' || !payload.userId) {
      throw new BadRequestException('Token invalid.');
    }

    const user = await this.userRepository.findOne({ where: { id: payload.userId } });
    if (!user) {
      throw new BadRequestException('Utilizatorul nu a fost gasit.');
    }

    // Update password in Supabase (primary auth source - must succeed)
    try {
      await this.supabaseService.updateUserPassword(user.id, newPassword);
    } catch (error) {
      console.error('Error updating password in Supabase:', error?.message);
      throw new BadRequestException('Nu am putut reseta parola. Te rugam sa incerci din nou.');
    }

    // Update hashed password in local DB (backup)
    user.password = await bcrypt.hash(newPassword, 10);
    await this.userRepository.save(user);

    return { message: 'Parola a fost resetata cu succes!' };
  }

  private sanitizeUser(user: User) {
    const { password, ...sanitized } = user;
    return sanitized;
  }
}
