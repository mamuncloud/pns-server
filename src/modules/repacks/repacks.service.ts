import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DRIZZLE_DB } from '../../common/database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { CreateRepackDto } from './dto/create-repack.dto';
import { getNextSkuFromDb } from '../../lib/sku-generator.util';
import { StockService } from '../stock/stock.service';

@Injectable()
export class RepacksService {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly stockService: StockService,
  ) {}

  async findAll(productId?: string, search?: string) {
    const repacks = await this.db.query.repacks.findMany({
      where: productId ? eq(schema.repacks.productId, productId) : undefined,
      with: {
        product: true,
        sourceVariant: true,
        items: {
          with: {
            targetVariant: true,
          },
        },
      },
      orderBy: [desc(schema.repacks.createdAt)],
    });

    if (!search) return repacks;

    return repacks.filter((repack) =>
      repack.product?.name?.toLowerCase().includes(search.toLowerCase())
    );
  }

  async create(dto: CreateRepackDto) {
    return await this.db.transaction(async (tx) => {
      // 1. Verify source variant exists and has enough stock
      const sourceVariant = await tx.query.productVariants.findFirst({
        where: eq(schema.productVariants.id, dto.sourceVariantId),
      });

      if (!sourceVariant) {
        throw new NotFoundException(`Varian asal dengan ID ${dto.sourceVariantId} tidak ditemukan`);
      }

      if (sourceVariant.stock < dto.sourceQtyUsed) {
        throw new BadRequestException(
          `Stok tidak mencukupi. Tersedia: ${sourceVariant.stock}, Diperlukan: ${dto.sourceQtyUsed}`,
        );
      }

      // 2. Insert the repack record
      const [repack] = await tx
        .insert(schema.repacks)
        .values({
          productId: dto.productId,
          sourceVariantId: dto.sourceVariantId,
          sourceQtyUsed: dto.sourceQtyUsed,
          note: dto.note,
        })
        .returning();

      // 3. Deduct stock from source variant via ledger
      await this.stockService.recordMovement(tx, {
        productVariantId: dto.sourceVariantId,
        type: 'REPACK_SOURCE',
        quantity: -dto.sourceQtyUsed,
        referenceId: repack.id,
        note: `Bahan baku repack`,
      });

      // 4. Calculate unit HPP for target variants based on source cost
      const totalUnitsProduced = dto.items.reduce((acc, item) => acc + item.qtyProduced, 0);
      const totalSourceCost = (sourceVariant.hpp || 0) * dto.sourceQtyUsed;
      const unitHpp = totalUnitsProduced > 0 ? Math.round(totalSourceCost / totalUnitsProduced) : 0;

      // 5. Process each output item
      for (const item of dto.items) {
        // Find the target variant by label and productId
        let targetVariant = await tx.query.productVariants.findFirst({
          where: and(
            eq(schema.productVariants.productId, dto.productId),
            eq(schema.productVariants.package, item.targetVariantPackage as any),
          ),
        });

        if (!targetVariant) {
          const sku = await getNextSkuFromDb(tx);
          const [newVariant] = await tx
            .insert(schema.productVariants)
            .values({
              productId: dto.productId,
              package: item.targetVariantPackage as any,
              price: item.sellingPrice,
              hpp: unitHpp,
              stock: 0,
              sku,
              sizeInGram: item.sizeInGram,
            })
            .returning();
          targetVariant = newVariant;
        } else {
          // Update HPP and sizeInGram to latest repack details
          await tx
            .update(schema.productVariants)
            .set({ 
              hpp: unitHpp,
              sizeInGram: item.sizeInGram,
            })
            .where(eq(schema.productVariants.id, targetVariant.id));
        }

        // Create repack item record
        await tx.insert(schema.repackItems).values({
          repackId: repack.id,
          targetVariantId: targetVariant.id,
          qtyProduced: item.qtyProduced,
          sellingPrice: item.sellingPrice,
          sizeInGram: item.sizeInGram,
        });

        // Increment stock of target variant via ledger
        await this.stockService.recordMovement(tx, {
          productVariantId: targetVariant.id,
          type: 'REPACK_TARGET',
          quantity: item.qtyProduced,
          referenceId: repack.id,
          note: `Hasil repack`,
        });
      }

      // 6. Return the full repack record with relations
      return tx.query.repacks.findFirst({
        where: eq(schema.repacks.id, repack.id),
        with: {
          product: true,
          sourceVariant: true,
          items: {
            with: {
              targetVariant: true,
            },
          },
        },
      });
    });
  }
}
