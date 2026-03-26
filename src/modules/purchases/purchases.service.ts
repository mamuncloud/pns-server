import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DRIZZLE_DB } from '../../common/database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../db/schema';
import { eq } from 'drizzle-orm';
import { CreatePurchaseDto } from './dto/create-purchase.dto';

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

      // Record adjustment (as purchase reason)
      // Note: Aggregate stock and HPP columns were removed from products table to match DB
      const [adjustment] = await tx.insert(schema.stockAdjustments).values({
        productId: dto.productId,
        qty: dto.qty,
        reason: 'PURCHASE',
        hppSnapshot: 0,
        totalLoss: 0,
      }).returning();

      return {
        message: 'Berhasil mencatat pembelian (stok agregat dinonaktifkan)',
        data: adjustment,
      };
    });
  }
}
