import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly baseUrl: string;
  private readonly deviceId: string;
  private readonly username: string;
  private readonly password: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('WHATSAPP_BASE_URL') || '';
    this.deviceId = this.configService.get<string>('WHATSAPP_DEVICE_ID') || '';
    this.username = this.configService.get<string>('WHATSAPP_USERNAME') || '';
    this.password = this.configService.get<string>('WHATSAPP_PASSWORD') || '';

    if (!this.baseUrl || !this.deviceId) {
      this.logger.warn('WhatsApp configuration is incomplete. WhatsApp messages will not be sent.');
    }
  }

  async sendMessage(phone: string, message: string): Promise<void> {
    if (!this.baseUrl || !this.deviceId) {
      this.logger.warn('WhatsApp not configured. Skipping message.');
      return;
    }

    const jid = phone.includes('@s.whatsapp.net') ? phone : `${phone}@s.whatsapp.net`;

    try {
      this.logger.log(`Sending WhatsApp message to ${phone}`);

      const response = await fetch(`${this.baseUrl}/send/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Id': this.deviceId,
          'Authorization': `Basic ${Buffer.from(`${this.username}:${this.password}`).toString('base64')}`,
        },
        body: JSON.stringify({
          phone: jid,
          message,
          is_forwarded: false,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        this.logger.error(`Failed to send WhatsApp message to ${phone}: ${JSON.stringify(data)}`);
        return;
      }

      this.logger.log(`WhatsApp message sent successfully to ${phone}`);
    } catch (err) {
      this.logger.error(`Unexpected error sending WhatsApp message to ${phone}: ${err.message}`);
    }
  }
}
