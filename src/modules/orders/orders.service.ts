import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DRIZZLE_DB } from '../../common/database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../db/schema';
import { eq, sql } from 'drizzle-orm';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
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

      // 3. Create order items and update stock
      for (const item of dto.items) {
        // Find variant to get product ID
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

        // Update product stock (Main stock in products table)
        await tx.update(schema.products)
          .set({
            stockQty: sql`${schema.products.stockQty} - ${item.quantity}`,
          })
          .where(eq(schema.products.id, variant.productId));
          
        // Also update variant stock if needed (compatibility)
        await tx.update(schema.productVariants)
          .set({
            stock: sql`${schema.productVariants.stock} - ${item.quantity}`,
          })
          .where(eq(schema.productVariants.id, item.productVariantId));
      }

      return {
        message: 'Pesanan berhasil dibuat',
        data: order,
      };
    });
  }

  async findAll() {
    return this.db.query.orders.findMany({
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
      orderBy: (orders, { desc }) => [desc(orders.createdAt)],
    });
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
