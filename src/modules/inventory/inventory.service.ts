import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE_DB } from '../../common/database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../db/schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class InventoryService {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async getStockSummary() {
    // This aggregates stock by product
    const products = await this.db.query.products.findMany({
      with: {
        variants: true,
        brand: true,
        images: true,
      },
    });

    return products.map((product) => {
      const totalStock = product.variants.reduce((acc, v) => acc + (v.stock || 0), 0);
      const totalValue = totalStock * (product.currentHpp || 0);
      
      return {
        id: product.id,
        name: product.name,
        brand: product.brand?.name,
        imageUrl: product.images?.[0]?.url,
        totalStock,
        totalValue,
        variantCount: product.variants.length,
        status: totalStock <= 5 ? 'CRITICAL' : totalStock <= 20 ? 'WARNING' : 'SAFE',
      };
    });
  }

  async getProductInventory(productId: string) {
    const product = await this.db.query.products.findFirst({
      where: eq(schema.products.id, productId),
      with: {
        brand: true,
        variants: {
          with: {
            purchaseItem: {
              with: {
                purchase: {
                  with: {
                    supplier: true,
                  },
                },
              },
            },
          },
          orderBy: (variants, { desc }) => [desc(variants.createdAt)],
        },
      },
    });

    if (!product) return null;

    return {
      product,
      batches: product.variants.map((v) => {
        const daysUntilExpiry = v.expiredDate 
          ? Math.ceil((new Date(v.expiredDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
          : null;

        return {
          id: v.id,
          label: v.label,
          stock: v.stock,
          price: v.price,
          expiredDate: v.expiredDate,
          daysUntilExpiry,
          purchaseDate: v.purchaseItem?.purchase?.date,
          supplierName: v.purchaseItem?.purchase?.supplier?.name,
          purchaseItemId: v.purchaseItemId,
        };
      }),
    };
  }

  async recordStockFromPurchase(tx: any, data: {
    productId: string;
    purchaseItemId: string;
    label: string;
    price: number;
    qty: number;
    expiredDate?: Date;
  }) {
    // This mirrors the logic previously in PurchasesService
    const [newVariant] = await tx
      .insert(schema.productVariants)
      .values({
        productId: data.productId,
        purchaseItemId: data.purchaseItemId,
        label: data.label as any,
        price: data.price,
        stock: data.qty,
        expiredDate: data.expiredDate,
      })
      .returning();

    return newVariant;
  }

  async removeStockByPurchaseItem(tx: any, purchaseItemId: string) {
    await tx
      .delete(schema.productVariants)
      .where(eq(schema.productVariants.purchaseItemId, purchaseItemId));
  }
}
