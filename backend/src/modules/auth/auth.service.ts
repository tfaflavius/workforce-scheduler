import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
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
    private readonly configService: ConfigService,
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
    // Verifica daca userul exista in DB
    const user = await this.userRepository.findOne({ where: { email } });
    // Nu dezvăluim dacă emailul există sau nu (securitate)
    if (!user) {
      return { message: 'Daca adresa de email exista in sistem, vei primi un link de resetare a parolei.' };
    }

    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'https://workforce-scheduler.vercel.app';
    try {
      await this.supabaseService.resetPasswordForEmail(email, `${frontendUrl}/reset-password`);
    } catch (error) {
      console.error('Error sending password reset email:', error?.message);
    }

    return { message: 'Daca adresa de email exista in sistem, vei primi un link de resetare a parolei.' };
  }

  async resetPassword(accessToken: string, newPassword: string) {
    // Verificam token-ul cu Supabase
    try {
      const supabaseUser = await this.supabaseService.getUser(accessToken);

      // Update password in Supabase
      await this.supabaseService.updateUserPassword(supabaseUser.id, newPassword);

      // Update hashed password in local DB
      const user = await this.userRepository.findOne({ where: { id: supabaseUser.id } });
      if (user) {
        user.password = await bcrypt.hash(newPassword, 10);
        await this.userRepository.save(user);
      }

      return { message: 'Parola a fost resetata cu succes!' };
    } catch (error) {
      throw new BadRequestException('Link-ul de resetare a expirat sau este invalid. Te rugam sa soliciti un nou link.');
    }
  }

  private sanitizeUser(user: User) {
    const { password, ...sanitized } = user;
    return sanitized;
  }
}
