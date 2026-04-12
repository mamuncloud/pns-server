import {
  Inject,
  Injectable,
  NotFoundException,
  Logger,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { DRIZZLE_DB } from '../../common/database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../db/schema';
import { eq, sql } from 'drizzle-orm';
import { CreateOrderDto } from './dto/create-order.dto';
import { StockService } from '../stock/stock.service';
import { FinanceService } from '../finance/finance.service';
import { PaymentService } from '../payment/payment.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { StoreSettingsService } from '../store-settings/store-settings.service';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly stockService: StockService,
    private readonly financeService: FinanceService,
    private readonly paymentService: PaymentService,
    private readonly whatsappService: WhatsAppService,
    private readonly storeSettingsService: StoreSettingsService,
  ) {}

  /**
   * Create a new order.
   *
   * WALK_IN CASH → stock deducted + income recorded immediately (cashier-confirmed sale)
   * QRIS PRE_ORDER → order PENDING, payment record created, Mayar invoice generated
   *                  → stock/income deferred until webhook confirms payment
   */
  async create(dto: CreateOrderDto, authUserId?: string) {
    // SECURITY CHECK: WALK_IN or CASH must be authenticated (Staff POS)
    const isStaffOrder = dto.orderType === 'WALK_IN' || dto.paymentMethod === 'CASH';

    if (isStaffOrder && !authUserId) {
      throw new UnauthorizedException(
        'Transaksi CASH/WALK_IN harus dilakukan oleh petugas (login diperlukan)',
      );
    }

    // CHECK STORE STATUS: Block order if store is closed
    const settings = await this.storeSettingsService.getSettings();
    if (!settings.isStoreOpen) {
      throw new BadRequestException('Toko sedang tutup. Tidak dapat membuat pesanan saat ini.');
    }

    return await this.db.transaction(async (tx) => {
      // 1. Identify or Register Customer
      let customerId = dto.userId;

      if (dto.customerPhone) {
        // Look up by phone
        const existingCustomer = await tx.query.users.findFirst({
          where: eq(schema.users.phone, dto.customerPhone),
        });

        if (existingCustomer) {
          customerId = existingCustomer.id;
          // Optional: Update name if provided and different
          if (dto.customerName && existingCustomer.name !== dto.customerName) {
            await tx
              .update(schema.users)
              .set({ name: dto.customerName })
              .where(eq(schema.users.id, existingCustomer.id));
          }
        } else {
          // Auto-register new customer
          const [newCustomer] = await tx
            .insert(schema.users)
            .values({
              phone: dto.customerPhone,
              name: dto.customerName || dto.customerPhone,
            })
            .returning();
          customerId = newCustomer.id;
        }
      }

      // 2. Calculate total
      const totalAmount = dto.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

      // 2. Status: QRIS always starts PENDING
      const isQris = dto.paymentMethod === 'QRIS';
      const paidAmount = isQris ? 0 : dto.paidAmount || 0;
      const changeAmount = isQris ? 0 : Math.max(0, paidAmount - totalAmount);
      const status = isQris ? 'PENDING' : 'PAID';

      // 3. Create order record
      const [order] = await tx
        .insert(schema.orders)
        .values({
          userId: customerId, // Linked to the identified/created customer
          customerName: dto.customerName,
          customerPhone: dto.customerPhone,
          orderType: dto.orderType as any,
          totalAmount,
          status: status as any,
          paymentMethod: (dto.paymentMethod || 'CASH') as any,
          paidAmount,
          changeAmount,
        })
        .returning();

      // 4. Create order items
      for (const item of dto.items) {
        const variant = await tx.query.productVariants.findFirst({
          where: eq(schema.productVariants.id, item.productVariantId),
        });

        if (!variant) {
          throw new NotFoundException(`Varian produk ${item.productVariantId} tidak ditemukan`);
        }

        await tx.insert(schema.orderItems).values({
          orderId: order.id,
          productVariantId: item.productVariantId,
          quantity: item.quantity,
          price: item.price,
        });

        // For WALK_IN CASH only: deduct stock immediately
        if (!isQris) {
          await this.stockService.recordMovement(tx, {
            productVariantId: item.productVariantId,
            type: 'SALE',
            quantity: -item.quantity,
            referenceId: order.id,
            note: 'Penjualan',
          });
        }
      }

      // 5. For WALK_IN CASH: record income immediately
      if (!isQris) {
        await this.financeService.recordTransaction(
          {
            type: 'INCOME',
            category: 'SALES',
            amount: totalAmount,
            description: `Penjualan Pesanan #${order.id.slice(-6)}`,
            paymentMethod: (dto.paymentMethod || 'CASH') as any,
            referenceId: order.id,
            employeeId: authUserId, // Record the staff member who performed the transaction
          },
          tx,
        );
      }

      // 6. For QRIS: create a payment record + generate Mayar invoice
      if (isQris) {
        // Create payment record in DB
        const [payment] = await tx
          .insert(schema.payments)
          .values({
            orderId: order.id,
            provider: 'MAYAR',
            status: 'PENDING',
            amount: totalAmount,
          })
          .returning();

        // Call Mayar API
        try {
          const invoiceResult = await this.paymentService.generateQrisInvoice(
            { id: order.id, totalAmount },
            { name: dto.customerName, phone: dto.customerPhone },
          );

          // Update payment record with provider details and payment URL
          await tx
            .update(schema.payments)
            .set({
              paymentUrl: invoiceResult.paymentUrl,
              providerInvoiceId: invoiceResult.mayarInvoiceId,
              providerTransactionId: invoiceResult.mayarTransactionId,
              expiresAt: invoiceResult.expiredAt,
            })
            .where(eq(schema.payments.id, payment.id));

          // Also denormalize paymentUrl on order for quick API response
          await tx
            .update(schema.orders)
            .set({ paymentUrl: invoiceResult.paymentUrl })
            .where(eq(schema.orders.id, order.id));

          order.paymentUrl = invoiceResult.directPaymentUrl;

          // Send WhatsApp notification in background
          this.whatsappService
            .sendPaymentLink(
              dto.customerPhone,
              invoiceResult.directPaymentUrl,
              order.id,
              totalAmount,
              dto.customerName || dto.customerPhone,
            )
            .catch((err) =>
              this.logger.error(`Failed to send WhatsApp notification: ${err.message}`),
            );
        } catch (error: any) {
          const errorMessage = error.message;
          this.logger.error(`Mayar invoice generation failed: ${errorMessage}`);

          if (errorMessage.includes('Duplicate Request')) {
            throw new Error(
              'Permintaan duplikat terdeteksi. Silakan tunggu 1 menit sebelum mencoba lagi dengan nomor WhatsApp yang sama.',
              { cause: error },
            );
          }

          throw new Error(`Gagal membuat link pembayaran QRIS: ${errorMessage}`, { cause: error });
        }
      }

      return {
        message: 'Pesanan berhasil dibuat',
        data: order,
      };
    });
  }

  /**
   * Look up a customer (user) by phone number.
   * Used for checkout form auto-fill UX.
   */
  async lookupCustomerByPhone(phone: string): Promise<{ name: string | null } | null> {
    const user = await this.db.query.users.findFirst({
      where: eq(schema.users.phone, phone),
      columns: { name: true },
    });
    return user ? { name: user.name } : null;
  }

  async findAll(search?: string) {
    const orders = await this.db.query.orders.findMany({
      with: {
        user: true,
        items: {
          with: {
            productVariant: {
              with: { product: true },
            },
          },
        },
        payments: true,
      },
      orderBy: (orders, { desc }) => [desc(orders.createdAt)],
    });

    if (!search) return orders;

    return orders.filter((order) => order.user?.name?.toLowerCase().includes(search.toLowerCase()));
  }

  async findOne(id: string) {
    return this.db.query.orders.findFirst({
      where: eq(schema.orders.id, id),
      with: {
        items: {
          with: {
            productVariant: {
              with: { product: true },
            },
          },
        },
        payments: true,
      },
    });
  }

  async findPublic(id: string) {
    const order = await this.db.query.orders.findFirst({
      where: eq(schema.orders.id, id),
      with: {
        items: {
          with: {
            productVariant: {
              with: { product: true },
            },
          },
        },
        payments: true,
      },
    });

    if (!order) return null;

    // Sanitize data for public view
    return {
      id: order.id,
      orderNumber: order.id.split('-')[0].toUpperCase(),
      status: order.status,
      totalAmount: order.totalAmount,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      createdAt: order.createdAt,
      items: order.items.map((item) => ({
        id: item.id,
        productName: item.productVariant?.product?.name || 'Produk',
        package: item.productVariant?.package,
        price: item.price,
        quantity: item.quantity,
        subtotal: item.price * item.quantity,
      })),
      payment:
        order.payments && order.payments.length > 0
          ? {
              status: order.payments[0].status,
              method: order.paymentMethod,
              paymentUrl: order.payments[0].paymentUrl,
              expiresAt: order.payments[0].expiresAt,
              directPaymentUrl:
                order.payments[0].provider === 'MAYAR' &&
                order.payments[0].paymentUrl?.includes('/invoices/') &&
                order.payments[0].providerTransactionId
                  ? order.payments[0].paymentUrl.split('/invoices/')[0] +
                    `/pay/${order.payments[0].providerTransactionId}`
                  : order.payments[0].paymentUrl,
            }
          : null,
    };
  }

  async getDashboardSummary() {
    const result = await this.db
      .select({
        totalRevenue: sql<number>`COALESCE(SUM(${schema.orders.totalAmount}) FILTER (WHERE ${schema.orders.status} IN ('PAID', 'COMPLETED')), 0)`,
        totalOrders: sql<number>`COUNT(${schema.orders.id})`,
        pendingOrders: sql<number>`COUNT(${schema.orders.id}) FILTER (WHERE ${schema.orders.status} = 'PENDING')`,
        walkInRevenue: sql<number>`COALESCE(SUM(${schema.orders.totalAmount}) FILTER (WHERE ${schema.orders.orderType} = 'WALK_IN' AND ${schema.orders.status} IN ('PAID', 'COMPLETED')), 0)`,
        preOrderRevenue: sql<number>`COALESCE(SUM(${schema.orders.totalAmount}) FILTER (WHERE ${schema.orders.orderType} = 'PRE_ORDER' AND ${schema.orders.status} IN ('PAID', 'COMPLETED')), 0)`,
      })
      .from(schema.orders);

    const stats = result[0];
    return {
      totalRevenue: Number(stats.totalRevenue),
      totalOrders: Number(stats.totalOrders),
      pendingOrders: Number(stats.pendingOrders),
      walkInRevenue: Number(stats.walkInRevenue),
      preOrderRevenue: Number(stats.preOrderRevenue),
    };
  }
}
