import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DRIZZLE_DB } from '../../common/database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { CreateRepackDto } from './dto/create-repack.dto';

@Injectable()
export class RepacksService {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async findAll(productId?: string) {
    return this.db.query.repacks.findMany({
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

      // 3. Deduct stock from source variant
      await tx
        .update(schema.productVariants)
        .set({
          stock: sourceVariant.stock - dto.sourceQtyUsed,
        })
        .where(eq(schema.productVariants.id, dto.sourceVariantId));

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
            eq(schema.productVariants.label, item.targetVariantLabel as any),
          ),
        });

        if (!targetVariant) {
          // Auto-create variant if it doesn't exist
          const [newVariant] = await tx
            .insert(schema.productVariants)
            .values({
              productId: dto.productId,
              label: item.targetVariantLabel as any,
              price: item.sellingPrice,
              hpp: unitHpp,
              stock: 0, // Will be updated below
            })
            .returning();
          targetVariant = newVariant;
        }

        // Create repack item record
        await tx.insert(schema.repackItems).values({
          repackId: repack.id,
          targetVariantId: targetVariant.id,
          qtyProduced: item.qtyProduced,
          sellingPrice: item.sellingPrice,
        });

        // Increment stock of target variant
        await tx
          .update(schema.productVariants)
          .set({
            stock: targetVariant.stock + item.qtyProduced,
            hpp: unitHpp, // Update HPP to latest repack cost
          })
          .where(eq(schema.productVariants.id, targetVariant.id));
      }

      // 5. Return the full repack record with relations
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
