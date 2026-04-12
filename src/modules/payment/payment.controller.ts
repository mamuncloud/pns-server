import { Controller, Post, Body } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PaymentService } from './payment.service';

@ApiTags('Payment')
@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  /**
   * Public: Mayar webhook endpoint, called by Mayar after payment is confirmed.
   */
  @Post('webhook/mayar')
  @ApiOperation({ summary: 'Mayar payment webhook callback' })
  @ApiResponse({ status: 200, description: 'Webhook received' })
  async mayarWebhook(@Body() payload: Record<string, unknown>) {
    return this.paymentService.handleMayarWebhook(payload as any);
  }
}
