import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { WhatsappService } from './whatsapp.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('whatsapp')
@Controller('whatsapp')
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @Get('status')
  @ApiOperation({ summary: 'Get WhatsApp connection status' })
  @ApiResponse({ status: 200, description: 'Return the current status and QR code if available' })
  getStatus() {
    return {
      status: this.whatsappService.getStatus(),
      qr: this.whatsappService.getQrCode(),
    };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MANAGER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout and clear WhatsApp session (Manager only)' })
  @ApiResponse({ status: 200, description: 'Session cleared and re-initializing' })
  async logout() {
    await this.whatsappService.logout();
    return { message: 'WhatsApp session cleared and re-initializing' };
  }
}
