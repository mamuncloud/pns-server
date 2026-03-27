import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DRIZZLE_DB } from '../../common/database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../db/schema';
import { eq } from 'drizzle-orm';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { UpdatePurchaseDto } from './dto/update-purchase.dto';
import { ProductVariantLabel } from '../products/dto/create-product.dto';

@Injectable()
export class PurchasesService {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  private async findOrCreateVariant(
    tx: any,
    productId: string,
    variantLabel: ProductVariantLabel | string | undefined,
    sellingPrice: number,
    qty: number,
  ) {
    const product = await tx.query.products.findFirst({
      where: eq(schema.products.id, productId),
      with: { variants: true },
    });

    if (!product) {
      throw new NotFoundException(`Produk dengan ID ${productId} tidak ditemukan`);
    }

    const normalizedLabel = this.normalizeVariantLabel(variantLabel);
    const existingVariant = product.variants.find((v: any) => v.label === normalizedLabel);

    if (!existingVariant) {
      const defaultLabel = (normalizedLabel || '250gr') as ProductVariantLabel;
      const [newVariant] = await tx
        .insert(schema.productVariants)
        .values({
          productId,
          label: defaultLabel,
          price: sellingPrice,
          stock: qty,
        })
        .returning();
      return { variant: newVariant, isNew: true };
    } else {
      await tx
        .update(schema.productVariants)
        .set({
          stock: existingVariant.stock + qty,
          price: sellingPrice,
        })
        .where(eq(schema.productVariants.id, existingVariant.id));
      return { variant: { ...existingVariant, stock: existingVariant.stock + qty }, isNew: false };
    }
  }

  private normalizeVariantLabel(label: ProductVariantLabel | string | undefined): string {
    if (!label) return '250gr';
    const labelStr = String(label).toLowerCase();
    const labelMap: Record<string, string> = {
      es3: 'ES3',
      es4: 'ES4',
      '250gr': '250gr',
      '500gr': '500gr',
      '1kg': '1kg',
      bal: 'bal',
    };
    return labelMap[labelStr] || (labelStr as any);
  }

  private async updateVariantStock(
    tx: any,
    productId: string,
    variantLabel: ProductVariantLabel | string | undefined,
    qtyChange: number,
    sellingPrice: number,
  ) {
    const product = await tx.query.products.findFirst({
      where: eq(schema.products.id, productId),
      with: { variants: true },
    });

    if (!product) {
      throw new NotFoundException(`Produk dengan ID ${productId} tidak ditemukan`);
    }

    const normalizedLabel = this.normalizeVariantLabel(variantLabel);
    const existingVariant = product.variants.find((v: any) => v.label === normalizedLabel);

    if (!existingVariant) {
      const defaultLabel = (normalizedLabel || '250gr') as ProductVariantLabel;
      await tx
        .insert(schema.productVariants)
        .values({
          productId,
          label: defaultLabel,
          price: sellingPrice,
          stock: qtyChange,
        })
        .returning();
    } else {
      const newStock = Math.max(0, existingVariant.stock + qtyChange);
      await tx
        .update(schema.productVariants)
        .set({
          stock: newStock,
          price: sellingPrice,
        })
        .where(eq(schema.productVariants.id, existingVariant.id));
    }
  }

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
          status: dto.status || 'DRAFT',
          totalAmount,
        })
        .returning();

      for (const item of dto.items) {
        // 3. Insert Purchase Item record
        const unitCost = (item.totalCost + item.extraCosts) / item.qty;

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

        // Skip stock and HPP updates if it's a DRAFT
        if (dto.status === 'COMPLETED') {
          const product = await tx.query.products.findFirst({
            where: eq(schema.products.id, item.productId),
            with: { variants: true },
          });

          if (!product) {
            throw new NotFoundException(`Produk dengan ID ${item.productId} tidak ditemukan`);
          }

          const totalCurrentStock = product.variants.reduce((acc, v: any) => acc + v.stock, 0);
          const newHpp = Math.round(
            (totalCurrentStock * product.currentHpp + item.qty * unitCost) /
              (totalCurrentStock + item.qty),
          );

          await tx
            .update(schema.products)
            .set({ currentHpp: newHpp })
            .where(eq(schema.products.id, item.productId));

          await this.findOrCreateVariant(
            tx,
            item.productId,
            item.variantLabel,
            item.sellingPrice,
            item.qty,
          );

          await tx.insert(schema.stockAdjustments).values({
            productId: item.productId,
            qty: item.qty,
            reason: 'PURCHASE',
            hppSnapshot: newHpp,
            totalLoss: 0,
          });
        }
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
            product: {
              with: {
                variants: true,
                brand: true,
              },
            },
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
            product: {
              with: {
                variants: true,
                brand: true,
              },
            },
          },
        },
      },
    });

    if (!purchase) {
      throw new NotFoundException(`Pembelian dengan ID ${id} tidak ditemukan`);
    }

    return purchase;
  }

  async update(id: string, dto: UpdatePurchaseDto) {
    return await this.db.transaction(async (tx) => {
      const existingPurchase = await tx.query.purchases.findFirst({
        where: eq(schema.purchases.id, id),
        with: { items: true },
      });

      if (!existingPurchase) {
        throw new NotFoundException(`Pembelian dengan ID ${id} tidak ditemukan`);
      }

      const newStatus = dto.status || existingPurchase.status;
      const wasCompleted = existingPurchase.status === 'COMPLETED';
      const willBeCompleted = newStatus === 'COMPLETED';
      const isChangingToDraft = wasCompleted && newStatus === 'DRAFT';

      if (isChangingToDraft) {
        for (const item of existingPurchase.items) {
          const product = await tx.query.products.findFirst({
            where: eq(schema.products.id, item.productId),
            with: { variants: true },
          });

          if (product) {
            const variant = product.variants.find((v: any) => v.label === item.variantLabel);
            if (variant) {
              await tx
                .update(schema.productVariants)
                .set({ stock: variant.stock - item.qty })
                .where(eq(schema.productVariants.id, variant.id));
            }

            const totalCurrentStock = product.variants.reduce((acc, v: any) => acc + v.stock, 0);
            const newHpp = Math.round(
              (totalCurrentStock * product.currentHpp - item.qty * item.unitCost) /
                (totalCurrentStock - item.qty),
            );
            await tx
              .update(schema.products)
              .set({ currentHpp: Math.max(0, newHpp) })
              .where(eq(schema.products.id, item.productId));
          }

          await tx
            .delete(schema.stockAdjustments)
            .where(eq(schema.stockAdjustments.productId, item.productId));
        }
      }

      if (dto.items && dto.items.length > 0) {
        const newTotalAmount = dto.items.reduce(
          (acc, item) => acc + item.totalCost + item.extraCosts,
          0,
        );

        await tx
          .update(schema.purchases)
          .set({
            supplierId: dto.supplierId || existingPurchase.supplierId,
            date: dto.date ? new Date(dto.date) : existingPurchase.date,
            note: dto.note !== undefined ? dto.note : existingPurchase.note,
            status: newStatus,
            totalAmount: newTotalAmount,
          })
          .where(eq(schema.purchases.id, id));

        if (willBeCompleted) {
          for (const existingItem of existingPurchase.items) {
            await this.updateVariantStock(
              tx,
              existingItem.productId,
              existingItem.variantLabel,
              -existingItem.qty,
              existingItem.sellingPrice,
            );
          }
        }

        await tx.delete(schema.purchaseItems).where(eq(schema.purchaseItems.purchaseId, id));

        for (const item of dto.items) {
          const unitCost = (item.totalCost + item.extraCosts) / item.qty;

          await tx.insert(schema.purchaseItems).values({
            purchaseId: id,
            productId: item.productId,
            variantLabel: item.variantLabel,
            qty: item.qty,
            totalCost: item.totalCost,
            extraCosts: item.extraCosts,
            unitCost: Math.round(unitCost),
            sellingPrice: item.sellingPrice,
            expiredDate: item.expiredDate ? new Date(item.expiredDate) : null,
          });

          if (willBeCompleted) {
            const product = await tx.query.products.findFirst({
              where: eq(schema.products.id, item.productId),
              with: { variants: true },
            });

            if (!product) {
              throw new NotFoundException(`Produk dengan ID ${item.productId} tidak ditemukan`);
            }

            const totalCurrentStock = product.variants.reduce((acc, v: any) => acc + v.stock, 0);
            const newHpp = Math.round(
              (totalCurrentStock * product.currentHpp + item.qty * unitCost) /
                (totalCurrentStock + item.qty),
            );

            await tx
              .update(schema.products)
              .set({ currentHpp: newHpp })
              .where(eq(schema.products.id, item.productId));

            await this.updateVariantStock(
              tx,
              item.productId,
              item.variantLabel,
              item.qty,
              item.sellingPrice,
            );

            await tx.insert(schema.stockAdjustments).values({
              productId: item.productId,
              qty: item.qty,
              reason: 'PURCHASE',
              hppSnapshot: newHpp,
              totalLoss: 0,
            });
          }
        }
      } else {
        await tx
          .update(schema.purchases)
          .set({
            supplierId: dto.supplierId || existingPurchase.supplierId,
            date: dto.date ? new Date(dto.date) : existingPurchase.date,
            note: dto.note !== undefined ? dto.note : existingPurchase.note,
            status: newStatus,
          })
          .where(eq(schema.purchases.id, id));

        if (!wasCompleted && willBeCompleted && existingPurchase.items.length > 0) {
          for (const item of existingPurchase.items) {
            const unitCost = item.unitCost;
            const product = await tx.query.products.findFirst({
              where: eq(schema.products.id, item.productId),
              with: { variants: true },
            });

            if (!product) {
              throw new NotFoundException(`Produk dengan ID ${item.productId} tidak ditemukan`);
            }

            const totalCurrentStock = product.variants.reduce((acc, v: any) => acc + v.stock, 0);
            const newHpp = Math.round(
              (totalCurrentStock * product.currentHpp + item.qty * unitCost) /
                (totalCurrentStock + item.qty),
            );

            await tx
              .update(schema.products)
              .set({ currentHpp: newHpp })
              .where(eq(schema.products.id, item.productId));

            await this.findOrCreateVariant(
              tx,
              item.productId,
              item.variantLabel,
              item.sellingPrice,
              item.qty,
            );

            await tx.insert(schema.stockAdjustments).values({
              productId: item.productId,
              qty: item.qty,
              reason: 'PURCHASE',
              hppSnapshot: newHpp,
              totalLoss: 0,
            });
          }
        }
      }

      return {
        message: 'Berhasil memperbarui transaksi pembelian',
        data: await this.findOne(id),
      };
    });
  }
}
