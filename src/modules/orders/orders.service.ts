import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DRIZZLE_DB } from '../../common/database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../db/schema';
import { eq } from 'drizzle-orm';
import { CreateOrderDto } from './dto/create-order.dto';
import { StockService } from '../stock/stock.service';
import { FinanceService } from '../finance/finance.service';

@Injectable()
export class OrdersService {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly stockService: StockService,
    private readonly financeService: FinanceService,
  ) {}

  async create(dto: CreateOrderDto) {
    return await this.db.transaction(async (tx) => {
      // 1. Calculate total amount
      const totalAmount = dto.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

      // 2. Calculate change amount and determine status
      const paidAmount = dto.paidAmount || 0;
      const changeAmount = Math.max(0, paidAmount - totalAmount);
      const status = (paidAmount >= totalAmount || dto.orderType === 'WALK_IN') ? 'PAID' : 'PENDING';

      // 3. Create order
      const [order] = await tx.insert(schema.orders).values({
        userId: dto.userId,
        orderType: dto.orderType as any,
        totalAmount: totalAmount,
        status: status as any,
        paymentMethod: (dto.paymentMethod || 'CASH') as any,
        paidAmount: paidAmount,
        changeAmount: changeAmount,
      }).returning();

      // 4. Create order items and record stock movements
      for (const item of dto.items) {
        const variant = await tx.query.productVariants.findFirst({
          where: eq(schema.productVariants.id, item.productVariantId),
        });

        if (!variant) {
          throw new NotFoundException(`Varian produk ${item.productVariantId} tidak ditemukan`);
        }

        // Create order item
        await tx.insert(schema.orderItems).values({
          orderId: order.id,
          productVariantId: item.productVariantId,
          pricingRuleId: item.pricingRuleId,
          quantity: item.quantity,
          price: item.price,
        });

        // Deduct stock via ledger
        await this.stockService.recordMovement(tx, {
          productVariantId: item.productVariantId,
          type: 'SALE',
          quantity: -item.quantity,
          referenceId: order.id,
          note: `Penjualan`,
        });
      }

      // 5. Record financial transaction if PAID
      if (status === 'PAID') {
        await this.financeService.recordTransaction({
          type: 'INCOME',
          category: 'SALES',
          amount: totalAmount,
          description: `Penjualan Pesanan #${order.id.slice(-6)}`,
          paymentMethod: (dto.paymentMethod || 'CASH') as any,
          referenceId: order.id,
          employeeId: dto.userId, // Assuming userId is the employee who made the sale
        }, tx);
      }

      return {
        message: 'Pesanan berhasil dibuat',
        data: order,
      };
    });
  }

  async findAll(search?: string) {
    const orders = await this.db.query.orders.findMany({
      with: {
        user: true,
        items: {
          with: {
            productVariant: {
              with: {
                product: true,
              },
            },
          },
        },
      },
      orderBy: (orders, { desc }) => [desc(orders.createdAt)],
    });

    if (!search) return orders;

    return orders.filter((order) =>
      order.user?.name?.toLowerCase().includes(search.toLowerCase())
    );
  }

  async findOne(id: string) {
    return this.db.query.orders.findFirst({
      where: eq(schema.orders.id, id),
      with: {
        items: {
          with: {
            productVariant: {
              with: {
                product: true,
              },
            },
          },
        },
      },
    });
  }
}
