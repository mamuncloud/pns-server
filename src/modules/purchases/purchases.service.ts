import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DRIZZLE_DB } from '../../common/database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../db/schema';
import { eq } from 'drizzle-orm';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { UpdatePurchaseDto } from './dto/update-purchase.dto';
import { StockService } from '../stock/stock.service';

@Injectable()
export class PurchasesService {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly stockService: StockService,
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
          status: dto.status || 'DRAFT',
          totalAmount,
        })
        .returning();

      for (const item of dto.items) {
        // 3. Insert Purchase Item record
        const unitCost = (item.totalCost + item.extraCosts) / item.qty;

        await tx
          .insert(schema.purchaseItems)
          .values({
            purchaseId: purchase.id,
            productId: item.productId,
            variantLabel: item.variantLabel,
            qty: item.qty,
            sizeInGram: item.sizeInGram,
            totalCost: item.totalCost,
            extraCosts: item.extraCosts,
            unitCost: Math.round(unitCost),
            sellingPrice: item.sellingPrice,
            expiredDate: item.expiredDate ? new Date(item.expiredDate) : null,
          })
          .returning();

        // Skip stock and HPP updates if it's a DRAFT
        if (dto.status === 'COMPLETED') {
          await this.syncProductVariantFromPurchaseItem(tx, purchase.id, {
            ...item,
            unitCost,
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

      // Revert stock if switching back to DRAFT
      if (isChangingToDraft) {
        for (const item of existingPurchase.items) {
          const product = await tx.query.products.findFirst({
            where: eq(schema.products.id, item.productId),
            with: { variants: true },
          });

          if (product && item.variantLabel) {
            const matchingVariant = product.variants.find(
              (v: any) => v.label === item.variantLabel,
            );
            if (matchingVariant) {
              await this.stockService.recordMovement(tx, {
                productVariantId: matchingVariant.id,
                type: 'PURCHASE_REVERSAL',
                quantity: -item.qty,
                referenceId: id,
                note: `Pembalikan pembelian ke DRAFT`,
              });
            }
          }
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

        await tx.delete(schema.purchaseItems).where(eq(schema.purchaseItems.purchaseId, id));

        for (const item of dto.items) {
          const unitCost = (item.totalCost + item.extraCosts) / item.qty;

          await tx
            .insert(schema.purchaseItems)
            .values({
              purchaseId: id,
              productId: item.productId,
              variantLabel: item.variantLabel,
              qty: item.qty,
              sizeInGram: item.sizeInGram,
              totalCost: item.totalCost,
              extraCosts: item.extraCosts,
              unitCost: Math.round(unitCost),
              sellingPrice: item.sellingPrice,
              expiredDate: item.expiredDate ? new Date(item.expiredDate) : null,
            })
            .returning();

          if (willBeCompleted) {
            await this.syncProductVariantFromPurchaseItem(tx, id, {
              ...item,
              unitCost,
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
            await this.syncProductVariantFromPurchaseItem(tx, id, item);
          }
        }
      }

      return {
        message: 'Berhasil memperbarui transaksi pembelian',
        data: await this.findOne(id),
      };
    });
  }

  async remove(id: string) {
    return await this.db.transaction(async (tx) => {
      const purchase = await tx.query.purchases.findFirst({
        where: eq(schema.purchases.id, id),
      });

      if (!purchase) {
        throw new NotFoundException(`Pembelian dengan ID ${id} tidak ditemukan`);
      }

      if (purchase.status !== 'DRAFT') {
        throw new BadRequestException('Hanya pembelian dengan status DRAFT yang dapat dihapus');
      }

      // Cascading delete is handled in schema (purchaseItems references purchases with onDelete: cascade)
      await tx.delete(schema.purchases).where(eq(schema.purchases.id, id));

      return {
        message: 'Berhasil menghapus transaksi pembelian',
      };
    });
  }

  private async syncProductVariantFromPurchaseItem(
    tx: any,
    purchaseId: string,
    item: any,
  ) {
    const product = await tx.query.products.findFirst({
      where: eq(schema.products.id, item.productId),
      with: { variants: true },
    });

    if (!product) {
      throw new NotFoundException(`Produk dengan ID ${item.productId} tidak ditemukan`);
    }

    if (item.variantLabel) {
      const existingVariant = product.variants.find(
        (v: any) => v.label === item.variantLabel,
      );

      const unitCost = item.unitCost || (item.totalCost + item.extraCosts) / item.qty;

      if (existingVariant) {
        // Update HPP, sizeInGram, price, and expiredDate
        await tx
          .update(schema.productVariants)
          .set({
            hpp: Math.round(unitCost),
            sizeInGram: item.sizeInGram || existingVariant.sizeInGram,
            price: item.sellingPrice || existingVariant.price,
            expiredDate: item.expiredDate ? new Date(item.expiredDate) : existingVariant.expiredDate,
          })
          .where(eq(schema.productVariants.id, existingVariant.id));

        await this.stockService.recordMovement(tx, {
          productVariantId: existingVariant.id,
          type: 'PURCHASE',
          quantity: item.qty,
          referenceId: purchaseId,
          note: `Pembelian disinkronkan`,
        });
      } else {
        // Auto-create variant if it doesn't exist
        const [newVariant] = await tx
          .insert(schema.productVariants)
          .values({
            productId: item.productId,
            label: item.variantLabel,
            price: item.sellingPrice,
            hpp: Math.round(unitCost),
            sizeInGram: item.sizeInGram,
            stock: 0,
            expiredDate: item.expiredDate ? new Date(item.expiredDate) : null,
          })
          .returning();

        await this.stockService.recordMovement(tx, {
          productVariantId: newVariant.id,
          type: 'PURCHASE',
          quantity: item.qty,
          referenceId: purchaseId,
          note: `Pembelian disinkronkan (varian baru)`,
        });
      }
    }
  }
}
