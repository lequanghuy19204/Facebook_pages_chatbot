import { Controller, Post, Body, UseGuards, Get, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { LoginDto, RegisterAdminDto, RegisterStaffDto, AuthResponseDto } from '../dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register/admin')
  async registerAdmin(@Body() registerAdminDto: RegisterAdminDto): Promise<AuthResponseDto> {
    return this.authService.registerAdmin(registerAdminDto);
  }

  @Post('register/staff')
  async registerStaff(@Body() registerStaffDto: RegisterStaffDto): Promise<{ message: string }> {
    return this.authService.registerStaff(registerStaffDto);
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
  }

  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  async logout(@Request() req: any): Promise<{ message: string }> {
    return this.authService.logout(req.user.user_id);
  }

  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  async getProfile(@Request() req: any) {
    return {
      user: req.user,
      message: 'Profile retrieved successfully',
    };
  }
}
