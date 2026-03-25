import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DRIZZLE_DB } from '../../common/database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../db/schema';
import { eq, sql } from 'drizzle-orm';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { calculateNewHpp } from '../../lib/pricing-engine.util';

@Injectable()
export class PurchasesService {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async create(dto: CreatePurchaseDto) {
    return await this.db.transaction(async (tx) => {
      const product = await tx.query.products.findFirst({
        where: eq(schema.products.id, dto.productId),
      });

      if (!product) {
        throw new NotFoundException(`Produk dengan ID ${dto.productId} tidak ditemukan`);
      }

      // Calculate new HPP
      const newHpp = calculateNewHpp(
        product.stockQty,
        product.currentHpp,
        dto.qty,
        dto.costPerUnit
      );

      // Record adjustment (as purchase reason)
      await tx.insert(schema.stockAdjustments).values({
        productId: dto.productId,
        qty: dto.qty,
        reason: 'PURCHASE',
        hppSnapshot: product.currentHpp,
        totalLoss: 0,
      });

      // Update product HPP and stock
      const updatedProduct = await tx.update(schema.products)
        .set({
          currentHpp: newHpp,
          stockQty: sql`${schema.products.stockQty} + ${dto.qty}`,
        })
        .where(eq(schema.products.id, dto.productId))
        .returning();

      return {
        message: 'Berhasil mencatat pembelian',
        data: updatedProduct[0],
      };
    });
  }
}
