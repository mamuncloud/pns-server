import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DRIZZLE_DB } from '../../common/database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../db/schema';
import { eq } from 'drizzle-orm';
import { CreateOrderDto } from './dto/create-order.dto';
import { StockService } from '../stock/stock.service';

@Injectable()
export class OrdersService {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly stockService: StockService,
  ) {}

  async create(dto: CreateOrderDto) {
    return await this.db.transaction(async (tx) => {
      // 1. Calculate total amount
      const totalAmount = dto.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

      // 2. Create order
      const [order] = await tx.insert(schema.orders).values({
        userId: dto.userId,
        orderType: dto.orderType as any,
        totalAmount: totalAmount,
        status: 'PENDING',
      }).returning();

      // 3. Create order items and record stock movements
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
