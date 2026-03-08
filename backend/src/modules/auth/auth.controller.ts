import { Body, Controller, Post, Get, Headers, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Public } from './decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('me')
  async getProfile(@Headers('authorization') authHeader: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing authorization header');
    }
    const token = authHeader.substring(7);
    return this.authService.getMe(token);
  }

  @Public()
  @Post('forgot-password')
  async forgotPassword(@Body() body: { email: string }) {
    return this.authService.forgotPassword(body.email);
  }

  @Public()
  @Post('reset-password')
  async resetPassword(@Body() body: { token?: string; accessToken?: string; newPassword: string }) {
    const resetToken = body.token || body.accessToken;
    if (!resetToken) {
      throw new UnauthorizedException('Token de resetare lipseste');
    }
    if (!body.newPassword || body.newPassword.length < 6) {
      throw new BadRequestException('Parola trebuie sa aiba cel putin 6 caractere');
    }
    return this.authService.resetPassword(resetToken, body.newPassword);
  }
}
