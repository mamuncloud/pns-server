import { Injectable, Logger, Inject } from '@nestjs/common';
import { DRIZZLE_DB } from '../../common/database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import { StockService } from '../stock/stock.service';
import { FinanceService } from '../finance/finance.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PAYMENT_EVENTS, PaymentSatisfiedEvent } from './events/payment.events';

export interface MayarCustomerInfo {
  name?: string;
  phone?: string;
}

export interface MayarInvoiceResult {
  paymentUrl: string;
  directPaymentUrl: string;
  mayarInvoiceId: string;
  mayarTransactionId: string;
  expiredAt: Date;
}

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly stockService: StockService,
    private readonly financeService: FinanceService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Generates a Mayar QRIS invoice and returns the payment URL.
   * Returns null if the Mayar API call fails (order can still exist in PENDING state).
   */
  async generateQrisInvoice(
    order: { id: string; totalAmount: number },
    customer: MayarCustomerInfo,
    frontendUrl?: string,
  ): Promise<MayarInvoiceResult | null> {
    const apiKey = process.env.MAYAR_API_KEY;
    const apiUrl = process.env.MAYAR_API_URL;

    if (!apiKey || !apiUrl) {
      this.logger.warn(
        `Mayar configuration missing (apiKey: ${!!apiKey}, apiUrl: ${!!apiUrl}). Skipping invoice generation.`,
      );
      return null;
    }

    const baseUrl = frontendUrl || process.env.FRONTEND_URL || 'http://localhost:3000';
    const redirectUrl = `${baseUrl}/order/${order.id}`;

    const expiredAt = new Date();
    expiredAt.setMinutes(
      expiredAt.getMinutes() + Number(process.env.MAYAR_PAYMENT_EXPIRY_MINUTES) || 10,
    );

    const payload = {
      name: customer.name || `walkin-${order.id}`,
      email: 'no-reply@pns.id',
      amount: order.totalAmount,
      mobile: customer.phone || '08000000000',
      redirectUrl,
      description: `Pesanan PNS #${order.id.split('-')[0].toUpperCase()}`,
      expiredAt: expiredAt.toISOString(),
    };

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as {
        statusCode: number;
        messages: string;
        message?: string;
        data: {
          id: string;
          transaction_id: string;
          transactionId: string;
          link: string;
        };
      };

      if (!response.ok || !data?.data?.link) {
        const errorMsg = data.message || data.messages || 'Unknown Mayar Error';
        this.logger.error(`Mayar API error [${response.status}]: ${JSON.stringify(data)}`);

        if (response.status === 429) {
          throw new Error(`Mayar Duplicate Request: ${errorMsg}`, { cause: data });
        }

        throw new Error(`Mayar API Error: ${errorMsg}`, { cause: data });
      }

      this.logger.log(`Mayar invoice created for order ${order.id}: ${data.data.link}`);

      const originalPaymentUrl = data.data.link;
      let directPaymentUrl = originalPaymentUrl;
      const mayarTransactionId = data.data.transactionId || data.data.transaction_id;

      try {
        if (directPaymentUrl.includes('/invoices/')) {
          directPaymentUrl = directPaymentUrl.split('/invoices/')[0] + `/pay/${mayarTransactionId}`;
        }
      } catch {
        this.logger.warn(
          `Failed to transform Mayar URL: ${directPaymentUrl}. Using original link.`,
        );
      }

      return {
        paymentUrl: originalPaymentUrl,
        directPaymentUrl,
        mayarInvoiceId: data.data.id,
        mayarTransactionId: mayarTransactionId,
        expiredAt: expiredAt,
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('Mayar')) {
        throw error; // Re-throw our descriptive errors
      }
      this.logger.error(`Failed to call Mayar API: ${(error as Error).message}`);
      throw new Error(`Sistem pembayaran sedang sibuk, silakan coba lagi nanti.`, { cause: error });
    }
  }

  /**
   * Handle Mayar payment webhook.
   * Called by Mayar after the customer completes payment.
   * This is where stock gets deducted and income is recorded.
   */
  async handleMayarWebhook(payload: any) {
    const event = payload.event;
    const data = payload.data;

    this.logger.verbose(
      `Mayar webhook received: event=${event}, 
      data=${JSON.stringify(payload)}`,
    );

    if (event !== 'payment.received') {
      this.logger.log(`Mayar webhook ignored: event=${event}`);
      return { received: true };
    }

    if (!data?.id) {
      this.logger.warn('Mayar webhook received without data.id');
      return { received: true };
    }

    const providerTransactionId = data.id;

    // Find the payment record by providerTransactionId
    const paymentRecord = await this.db.query.payments.findFirst({
      where: eq(schema.payments.providerTransactionId, providerTransactionId),
    });

    if (!paymentRecord) {
      this.logger.warn(
        `Mayar webhook: no payment record found for providerTransactionId=${providerTransactionId}`,
      );
      return { received: true };
    }

    if (paymentRecord.status === 'PAID') {
      this.logger.log(
        `Mayar webhook: payment ${paymentRecord.id} already PAID, skipping (idempotent).`,
      );
      return { received: true };
    }

    // Fetch order + items
    const order = await this.db.query.orders.findFirst({
      where: eq(schema.orders.id, paymentRecord.orderId),
      with: { items: true },
    });

    if (!order) {
      this.logger.error(`Mayar webhook: order ${paymentRecord.orderId} not found!`);
      return { received: true };
    }

    // Process confirmed payment in a transaction
    await this.db.transaction(async (tx) => {
      // Mark payment record as PAID
      await tx
        .update(schema.payments)
        .set({ status: 'PAID', paidAt: new Date() })
        .where(eq(schema.payments.id, paymentRecord.id));

      // Mark order as PAID
      await tx
        .update(schema.orders)
        .set({ status: 'PAID', paidAmount: order.totalAmount })
        .where(eq(schema.orders.id, order.id));

      // Deduct stock per item
      for (const item of order.items) {
        if (order.eventId) {
          // Deduct from Event Stock bucket
          const [eventItem] = await tx
            .select()
            .from(schema.eventItems)
            .where(
              and(
                eq(schema.eventItems.eventId, order.eventId),
                eq(schema.eventItems.productVariantId, item.productVariantId),
              ),
            )
            .limit(1);

          if (eventItem) {
            await tx
              .update(schema.eventItems)
              .set({ stock: Math.max(0, eventItem.stock - item.quantity) })
              .where(eq(schema.eventItems.id, eventItem.id));
          }
          // Note: We don't record movement in StockService here because the stock 
          // was already deducted from main warehouse during EVENT_ALLOCATION.
        } else {
          // Deduct from Main Stock
          await this.stockService.recordMovement(tx, {
            productVariantId: item.productVariantId,
            type: 'SALE',
            quantity: -item.quantity,
            referenceId: order.id,
            note: 'Penjualan MAYAR (Mayar Webhook)',
          });
        }
      }

      // Record income
      await this.financeService.recordTransaction(
        {
          type: 'INCOME',
          category: 'SALES',
          amount: order.totalAmount,
          description: `Penjualan MAYAR Pesanan #${order.id.split('-')[0].toUpperCase()}`,
          paymentMethod: 'MAYAR',
          referenceId: order.id,
        },
        tx,
      );
    });

    this.logger.log(
      `Mayar webhook: order ${order.id} and payment ${paymentRecord.id} marked as PAID.`,
    );

    // Emit event for post-payment actions (e.g., WhatsApp notification)
    this.eventEmitter.emit(
      PAYMENT_EVENTS.SATISFIED,
      new PaymentSatisfiedEvent(
        order.id,
        order.customerName || 'Pelanggan',
        order.customerPhone,
        order.totalAmount,
      ),
    );

    return { received: true, orderId: order.id };
  }
}
