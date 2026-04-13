import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import { PAYMENT_EVENTS, PaymentSatisfiedEvent, PaymentLinkGeneratedEvent } from '../payment/events/payment.events';
import { ORDER_EVENTS, OrderReadyEvent } from '../orders/events/order.events';


@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly baseUrl: string;
  private readonly deviceId: string;
  private readonly authHeader: string;
  private readonly frontendUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl =
      this.configService.get<string>('WA_URL') || 'https://whatsapp.planetnyemilsnack.store';
    this.deviceId = this.configService.get<string>('WA_DEVICE_ID');
    const username = this.configService.get<string>('WA_USERNAME') || 'planet';
    const password = this.configService.get<string>('WA_PASSWORD') || 'nyemilsnack';
    this.authHeader = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
  }

  private formatPhone(phone: string): string {
    let formattedPhone = phone.replace(/[^0-9]/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '62' + formattedPhone.slice(1);
    }

    if (!formattedPhone.includes('@')) {
      formattedPhone = `${formattedPhone}@s.whatsapp.net`;
    }
    return formattedPhone;
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

    const formattedPhone = this.formatPhone(phone);

    const message = `*Planet Nyemil Snack* 🍪
Welcome back, *${userName}*! 👋

Click the link below to log in to your account. This link will expire in *15 minutes*. ⏳

🔗 ${magicLink}

_If you did not request this link, please ignore this message._`;

    return this.sendRawMessage(formattedPhone, message, phone);
  }

  @OnEvent(PAYMENT_EVENTS.SATISFIED)
  async handlePaymentSatisfied(event: PaymentSatisfiedEvent) {
    this.logger.log(`Handling payment.satisfied for order ${event.orderId}`);

    const orderUrl = `${this.frontendUrl}/order/${event.orderId}`;

    await this.sendOrderConfirmation(
      event.customerPhone,
      event.customerName,
      event.orderId,
      orderUrl,
    );
  }

  @OnEvent(PAYMENT_EVENTS.LINK_GENERATED)
  async handlePaymentLinkGenerated(event: PaymentLinkGeneratedEvent) {
    this.logger.log(`Handling payment.link_generated for order ${event.orderId}`);

    await this.sendPaymentLink(
      event.customerPhone,
      event.paymentUrl,
      event.orderId,
      event.amount,
      event.customerName,
    );
  }

  async sendOrderConfirmation(
    phone: string,
    customerName: string,
    orderId: string,
    orderUrl: string,
  ) {
    if (!this.deviceId) {
      this.logger.warn('WA_DEVICE_ID is not defined. WhatsApp message will not be sent.');
      return;
    }

    if (!phone) {
      this.logger.warn(`Phone number for ${customerName} is empty. Skipping WhatsApp message.`);
      return;
    }

    const formattedPhone = this.formatPhone(phone);
    const shortOrderId = orderId.split('-')[0].toUpperCase();

    const message = `*Planet Nyemil Snack* 🍪
Halo *${customerName}*! 🎉

Pembayaran Anda untuk Pesanan *#${shortOrderId}* telah kami terima dan berstatus *LUNAS*. ✅

Silakan simpan link di bawah ini sebagai bukti pemesanan untuk pengambilan snack:

🔗 ${orderUrl}

Terima kasih telah berbelanja di Planet Nyemil! 🙏`;

    return this.sendRawMessage(formattedPhone, message, phone);
  }

  async sendPaymentLink(
    phone: string,
    paymentUrl: string,
    orderId: string,
    amount: number,
    customerName: string,
  ) {
    if (!this.deviceId) {
      this.logger.warn('WA_DEVICE_ID is not defined. WhatsApp message will not be sent.');
      return;
    }

    if (!phone) {
      this.logger.warn(`Phone number for ${customerName} is empty. Skipping WhatsApp message.`);
      return;
    }

    const formattedPhone = this.formatPhone(phone);
    const shortOrderId = orderId.slice(-6).toUpperCase();
    const formattedAmount = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);

    const message = `*Planet Nyemil Snack* 🍪
Halo *${customerName}*! 🎉

Terima kasih telah memesan. Berikut adalah link pembayaran QRIS untuk Pesanan *#${shortOrderId}* sebesar *${formattedAmount}*:

🔗 ${paymentUrl}

Segera lakukan pembayaran dalam *3 menit* sebelum link kedaluwarsa. ⏳

_Abaikan pesan ini jika Anda sudah melakukan pembayaran._`;

    return this.sendRawMessage(formattedPhone, message, phone);
  }

  private async sendRawMessage(formattedPhone: string, message: string, originalPhone: string) {
    try {
      this.logger.log(`Sending WhatsApp message to ${formattedPhone}`);

      const response = await fetch(`${this.baseUrl}/send/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Id': this.deviceId,
          Authorization: this.authHeader,
        },
        body: JSON.stringify({
          phone: formattedPhone,
          message: message,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `Failed to send WhatsApp message to ${originalPhone}: ${response.status} ${errorText}`,
        );
        return { success: false };
      }

      this.logger.log(`WhatsApp message sent successfully to ${originalPhone}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Error sending WhatsApp message to ${originalPhone}: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  @OnEvent(ORDER_EVENTS.READY)
  async handleOrderReady(event: OrderReadyEvent) {
    this.logger.log(`Handling order.ready for order ${event.orderId}`);

    await this.sendOrderReadyMessage(
      event.customerPhone,
      event.customerName,
      event.orderId,
    );
  }

  async sendOrderReadyMessage(
    phone: string,
    customerName: string,
    orderId: string,
  ) {
    if (!this.deviceId) {
      this.logger.warn('WA_DEVICE_ID is not defined. WhatsApp message will not be sent.');
      return;
    }

    if (!phone) {
      this.logger.warn(`Phone number for ${customerName} is empty. Skipping WhatsApp message.`);
      return;
    }

    const formattedPhone = this.formatPhone(phone);
    const shortOrderId = orderId.split('-')[0].toUpperCase();

    const message = `*Planet Nyemil Snack* 🍪
Halo *${customerName}*! 🎉

Pesanan Anda dengan nomor *#${shortOrderId}* sudah *SIAP DIAMBIL*. 📦✨

Terima kasih telah berbelanja di Planet Nyemil! 🙏`;

    return this.sendRawMessage(formattedPhone, message, phone);
  }
}
