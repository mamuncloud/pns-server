import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DRIZZLE_DB } from '../../common/database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../db/schema';
import { eq, sql } from 'drizzle-orm';
import { CreateStockAdjustmentDto } from './dto/create-stock-adjustment.dto';

@Injectable()
export class StockAdjustmentsService {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async create(dto: CreateStockAdjustmentDto) {
    return await this.db.transaction(async (tx) => {
      const product = await tx.query.products.findFirst({
        where: eq(schema.products.id, dto.productId),
      });

      if (!product) {
        throw new NotFoundException(`Produk dengan ID ${dto.productId} tidak ditemukan`);
      }

      // Calculate total loss if qty is negative and reason is one of DEFECT, EXPIRED, LOST
      let totalLoss = 0;
      if (dto.qty < 0 && ['DEFECT', 'EXPIRED', 'LOST'].includes(dto.reason)) {
        totalLoss = Math.abs(dto.qty) * Number(product.currentHpp);
      }

      // Record adjustment
      const [adjustment] = await tx.insert(schema.stockAdjustments).values({
        productId: dto.productId,
        qty: dto.qty,
        reason: dto.reason as any,
        hppSnapshot: product.currentHpp,
        totalLoss: totalLoss,
      }).returning();

      // Update product stock
      await tx.update(schema.products)
        .set({
          stockQty: sql`${schema.products.stockQty} + ${dto.qty}`,
        })
        .where(eq(schema.products.id, dto.productId));

      return adjustment;
    });
  }

  async findAll() {
    return this.db.query.stockAdjustments.findMany({
      with: {
        product: true,
      },
      orderBy: (adjustments, { desc }) => [desc(adjustments.createdAt)],
    });
  }
}
