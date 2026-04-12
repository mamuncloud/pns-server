import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  Res,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiTags, ApiOperation, ApiBody, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { LoginRequestDto } from './dto/login-request.dto';
import type { Response, Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('request-login')
  @ApiOperation({ summary: 'Request a magic link for login' })
  @ApiBody({ type: LoginRequestDto })
  @ApiResponse({
    status: 201,
    description: 'Magic link request handled. Generic message returned for security.',
  })
  async requestLogin(@Body() loginDto: LoginRequestDto) {
    return this.authService.requestLogin(loginDto.identifier);
  }

  @Get('verify')
  @ApiOperation({ summary: 'Verify magic link token and return JWT' })
  @ApiResponse({ status: 200, description: 'Token verified successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or expired token' })
  async verifyLogin(@Query('token') token: string, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.verifyLogin(token);

    // Set refresh token in httpOnly cookie
    res.cookie('refresh_token', result.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });

    // Return only access token and user info in body
    return {
      access_token: result.access_token,
      user: result.user,
    };
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token using refresh token cookie' })
  @ApiResponse({ status: 201, description: 'New access token issued' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(@Req() req: ExpressRequest, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies['refresh_token'];

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token missing');
    }

    const result = await this.authService.refresh(refreshToken);

    // Rotate refresh token cookie
    res.cookie('refresh_token', result.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });

    return {
      access_token: result.access_token,
    };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ANY_EMPLOYEE')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout and clear refresh token' })
  @ApiResponse({ status: 201, description: 'Logged out successfully' })
  async logout(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies['refresh_token'];

    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }

    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return { success: true };
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ANY_EMPLOYEE')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved successfully' })
  async getProfile(@Req() req: any) {
    return {
      message: 'Berhasil mengambil profil pengguna',
      data: req.user,
    };
  }
}
