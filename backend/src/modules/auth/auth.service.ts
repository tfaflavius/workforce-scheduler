import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { SupabaseService } from '../../common/supabase/supabase.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly supabaseService: SupabaseService,
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

      // Don't auto-login - user needs to verify email first
      return {
        message: 'Cont creat cu succes! Verifică emailul pentru a confirma adresa. După confirmare, un administrator va aproba contul tău.',
        user: this.sanitizeUser(user),
        requiresEmailVerification: true,
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

      // Check email verification from Supabase
      const supabaseUser = await this.supabaseService.getUser(loginResult.session.access_token);
      if (supabaseUser.email_confirmed_at && !user.emailVerified) {
        // Update our DB if Supabase has confirmed email
        user.emailVerified = true;
        await this.userRepository.save(user);
      }

      if (!user.emailVerified) {
        throw new UnauthorizedException('Te rugăm să confirmi adresa de email. Verifică inbox-ul pentru linkul de confirmare.');
      }

      if (!user.isActive) {
        throw new UnauthorizedException('Contul tău așteaptă aprobarea unui administrator. Vei primi acces în curând.');
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

  private sanitizeUser(user: User) {
    const { password, ...sanitized } = user;
    return sanitized;
  }
}
