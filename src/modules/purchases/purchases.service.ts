import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DRIZZLE_DB } from '../../common/database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../db/schema';
import { eq } from 'drizzle-orm';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { ProductVariantLabel } from '../products/dto/create-product.dto';

@Injectable()
export class PurchasesService {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async create(dto: CreatePurchaseDto) {
    return await this.db.transaction(async (tx) => {
      // 1. Calculate total amount (total cost + extra costs for all items)
      const totalAmount = dto.items.reduce(
        (acc, item) => acc + item.totalCost + item.extraCosts,
        0,
      );

      // 2. Create purchase header
      const [purchase] = await tx
        .insert(schema.purchases)
        .values({
          supplierId: dto.supplierId,
          date: new Date(dto.date),
          note: dto.note,
          totalAmount,
        })
        .returning();

      for (const item of dto.items) {
        // 3. Get product and current stock/HPP
        const product = await tx.query.products.findFirst({
          where: eq(schema.products.id, item.productId),
          with: {
            variants: true,
          },
        });

        if (!product) {
          throw new NotFoundException(
            `Produk dengan ID ${item.productId} tidak ditemukan`,
          );
        }

        // Total stock across all variants for HPP calculation
        const totalCurrentStock = product.variants.reduce(
          (acc, v) => acc + v.stock,
          0,
        );
        const unitCost = (item.totalCost + item.extraCosts) / item.qty;

        // 4. Calculate New HPP (Weighted Average)
        // Formula: (currentStock * lastHpp + newQty * unitCost) / (currentStock + newQty)
        const newHpp = Math.round(
          (totalCurrentStock * product.currentHpp + item.qty * unitCost) /
            (totalCurrentStock + item.qty),
        );

        // 5. Update Product HPP
        await tx
          .update(schema.products)
          .set({ currentHpp: newHpp })
          .where(eq(schema.products.id, item.productId));

        // 6. Find or Create Variant
        const variant = product.variants.find((v) => v.label === item.variantLabel);

        if (!variant) {
          // If variantLabel is not provided, we need a default from the enum
          const defaultLabel = item.variantLabel || ProductVariantLabel['250GR'];

          await tx
            .insert(schema.productVariants)
            .values({
              productId: item.productId,
              label: defaultLabel,
              price: item.sellingPrice,
              stock: item.qty,
            })
            .returning();
        } else {
          // Update existing variant stock and price
          await tx
            .update(schema.productVariants)
            .set({
              stock: variant.stock + item.qty,
              price: item.sellingPrice,
            })
            .where(eq(schema.productVariants.id, variant.id));
        }

        // 7. Insert Purchase Item record
        await tx.insert(schema.purchaseItems).values({
          purchaseId: purchase.id,
          productId: item.productId,
          variantLabel: item.variantLabel,
          qty: item.qty,
          totalCost: item.totalCost,
          extraCosts: item.extraCosts,
          unitCost: Math.round(unitCost),
          sellingPrice: item.sellingPrice,
          expiredDate: item.expiredDate ? new Date(item.expiredDate) : null,
        });

        // 8. Record Stock Adjustment for Audit Trail
        await tx.insert(schema.stockAdjustments).values({
          productId: item.productId,
          qty: item.qty,
          reason: 'PURCHASE',
          hppSnapshot: newHpp,
          totalLoss: 0,
        });
      }

      return {
        message: 'Berhasil mencatat transaksi pembelian',
        data: {
          id: purchase.id,
          totalAmount: purchase.totalAmount,
          itemCount: dto.items.length,
        },
      };
    });
  }

  async findAll() {
    return await this.db.query.purchases.findMany({
      with: {
        supplier: true,
        items: {
          with: {
            product: true,
          },
        },
      },
      orderBy: (purchases, { desc }) => [desc(purchases.date)],
    });
  }

  async findOne(id: string) {
    const purchase = await this.db.query.purchases.findFirst({
      where: eq(schema.purchases.id, id),
      with: {
        supplier: true,
        items: {
          with: {
            product: true,
          },
        },
      },
    });

    if (!purchase) {
      throw new NotFoundException(`Pembelian dengan ID ${id} tidak ditemukan`);
    }

    return purchase;
  }
}
