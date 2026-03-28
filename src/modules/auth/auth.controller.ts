import { Controller, Post, Body, Get, Query, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiTags, ApiOperation, ApiBody, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { LoginRequestDto } from './dto/login-request.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('request-login')
  @ApiOperation({ summary: 'Request a magic link for login' })
  @ApiBody({ type: LoginRequestDto })
  @ApiResponse({ status: 201, description: 'Magic link request handled. Generic message returned for security.' })
  async requestLogin(@Body() loginDto: LoginRequestDto) {
    return this.authService.requestLogin(loginDto.email);
  }

  @Get('verify')
  @ApiOperation({ summary: 'Verify magic link token and return JWT' })
  @ApiResponse({ status: 200, description: 'Token verified successfully', type: LoginResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid or expired token' })
  async verifyLogin(@Query('token') token: string) {
    return this.authService.verifyLogin(token);
  }

  @Post('reissue')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Re-issue a fresh JWT for an active authenticated user' })
  @ApiResponse({ status: 201, description: 'New access token issued' })
  @ApiResponse({ status: 401, description: 'Token expired or invalid' })
  reissueToken(@Request() req: { user: { id: string; email: string; role: string; name: string; type: string } }) {
    return this.authService.reissueToken(req.user);
  }
}
