import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class MailsService {
  private readonly logger = new Logger(MailsService.name);
  private readonly resend: Resend;
  private readonly from: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.from = this.configService.get<string>('MAIL_FROM') || 'onboarding@resend.dev';
    
    if (!apiKey) {
      this.logger.warn('RESEND_API_KEY is not defined. Emails will not be sent.');
    }
    
    this.resend = new Resend(apiKey);
  }

  async sendMagicLink(email: string, magicLink: string, userName: string) {
    try {
      this.logger.log(`Sending magic link to ${email}`);
      
      const { data, error } = await this.resend.emails.send({
        from: this.from,
        to: email,
        subject: 'Your Magic Login Link - PNS',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #333;">Welcome back, ${userName}!</h2>
            <p style="color: #666; font-size: 16px;">Click the button below to log in to your account. This link will expire in 15 minutes.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${magicLink}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Log In Now</a>
            </div>
            <p style="color: #999; font-size: 14px;">If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="color: #999; font-size: 12px; word-break: break-all;">${magicLink}</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="color: #ccc; font-size: 10px; text-align: center;">&copy; ${new Date().getFullYear()} PNS - Pas Nenan Seleranya</p>
          </div>
        `,
      });

      if (error) {
        this.logger.error(`Failed to send email to ${email}: ${JSON.stringify(error)}`);
        return { success: false, error };
      }

      this.logger.log(`Email sent successfully to ${email}. ID: ${data?.id}`);
      return { success: true, data };
    } catch (err) {
      this.logger.error(`Unexpected error sending email to ${email}: ${err.message}`);
      return { success: false, error: err };
    }
  }
}
