import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DRIZZLE_DB } from '../../common/database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../db/schema';
import { eq, desc, inArray } from 'drizzle-orm';
import { AdjustStockDto } from './dto/adjust-stock.dto';

export interface RecordMovementPayload {
  productVariantId: string;
  type: (typeof schema.stockMovementTypeEnum.enumValues)[number];
  quantity: number; // positive = in, negative = out
  referenceId?: string;
  note?: string;
}

@Injectable()
export class StockService {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  /**
   * Records a stock movement within a transaction and updates the variant's stock.
   * Must be called with an active transaction (`tx`) to ensure atomicity.
   */
  async recordMovement(
    tx: NodePgDatabase<typeof schema>,
    payload: RecordMovementPayload,
  ): Promise<void> {
    const variant = await tx.query.productVariants.findFirst({
      where: eq(schema.productVariants.id, payload.productVariantId),
    });

    if (!variant) {
      throw new NotFoundException(
        `Varian produk dengan ID ${payload.productVariantId} tidak ditemukan`,
      );
    }

    const newBalance = variant.stock + payload.quantity;

    if (newBalance < 0) {
      throw new BadRequestException(
        `Stok tidak mencukupi. Tersedia: ${variant.stock}, Perubahan: ${payload.quantity}`,
      );
    }

    // Update the variant's stock
    await tx
      .update(schema.productVariants)
      .set({ stock: newBalance })
      .where(eq(schema.productVariants.id, payload.productVariantId));

    // Insert ledger entry
    await tx.insert(schema.stockMovements).values({
      productVariantId: payload.productVariantId,
      type: payload.type,
      quantity: payload.quantity,
      balanceAfter: newBalance,
      referenceId: payload.referenceId,
      note: payload.note,
    });
  }

  /**
   * Get all stock movements, optionally filtered by productVariantId, productId, or search by product name.
   */
  async findAll(params?: { productVariantId?: string; productId?: string; search?: string }) {
    let variantIds: string[] = [];

    if (params?.productId) {
      const variants = await this.db.query.productVariants.findMany({
        where: eq(schema.productVariants.productId, params.productId),
        columns: { id: true },
      });
      variantIds = variants.map((v) => v.id);

      if (variantIds.length === 0) return [];
    }

    if (params?.productVariantId) {
      variantIds = [params.productVariantId];
    }

    const movements = await this.db.query.stockMovements.findMany({
      where:
        variantIds.length > 0
          ? inArray(schema.stockMovements.productVariantId, variantIds)
          : undefined,
      with: {
        productVariant: {
          with: {
            product: true,
          },
        },
      },
      orderBy: [desc(schema.stockMovements.createdAt)],
    });

    if (!params?.search) return movements;

    return movements.filter((movement) =>
      movement.productVariant?.product?.name?.toLowerCase().includes(params.search!.toLowerCase()),
    );
  }

  /**
   * Manual stock adjustment (e.g. stock opname, shrinkage, damaged goods).
   */
  async adjust(dto: AdjustStockDto) {
    return await this.db.transaction(async (tx) => {
      await this.recordMovement(tx, {
        productVariantId: dto.productVariantId,
        type: 'ADJUSTMENT',
        quantity: dto.quantity,
        note: dto.note,
      });

      return {
        message: 'Penyesuaian stok berhasil dicatat',
      };
    });
  }
}
