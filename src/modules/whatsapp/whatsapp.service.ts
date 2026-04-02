import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly baseUrl: string;
  private readonly deviceId: string;
  private readonly authHeader: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('WA_URL') || 'https://whatsapp.planetnyemilsnack.store';
    this.deviceId = this.configService.get<string>('WA_DEVICE_ID');
    const username = this.configService.get<string>('WA_USERNAME') || 'planet';
    const password = this.configService.get<string>('WA_PASSWORD') || 'nyemilsnack';
    this.authHeader = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
  }

  async sendMagicLink(phone: string, magicLink: string, userName: string) {
    if (!this.deviceId) {
      this.logger.warn('WA_DEVICE_ID is not defined. WhatsApp message will not be sent.');
      return;
    }

    if (!phone) {
      this.logger.warn(`Phone number for ${userName} is empty. Skipping WhatsApp message.`);
      return;
    }

    // Ensure phone is formatted correctly for WhatsApp API
    // If it starts with 0, replace with 62 (Indonesian country code as default)
    let formattedPhone = phone.replace(/[^0-9]/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '62' + formattedPhone.slice(1);
    }
    
    // Construct the WhatsApp identifier if not already provided as one
    if (!formattedPhone.includes('@')) {
      formattedPhone = `${formattedPhone}@s.whatsapp.net`;
    }

    const message = `*Planet Nyemil Snack* 🍪
Welcome back, *${userName}*! 👋

Click the link below to log in to your account. This link will expire in *15 minutes*. ⏳

🔗 ${magicLink}

_If you did not request this link, please ignore this message._`;

    try {
      this.logger.log(`Sending WhatsApp magic link to ${formattedPhone}`);
      
      const response = await fetch(`${this.baseUrl}/send/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Id': this.deviceId,
          'Authorization': this.authHeader,
        },
        body: JSON.stringify({
          phone: formattedPhone,
          message: message,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Failed to send WhatsApp message to ${phone}: ${response.status} ${errorText}`);
        return;
      }

      this.logger.log(`WhatsApp magic link sent successfully to ${phone}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Error sending WhatsApp message to ${phone}: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}
