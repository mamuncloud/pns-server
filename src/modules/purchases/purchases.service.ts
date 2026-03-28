import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DRIZZLE_DB } from '../../common/database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../db/schema';
import { eq } from 'drizzle-orm';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { UpdatePurchaseDto } from './dto/update-purchase.dto';

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
            totalCost: item.totalCost,
            extraCosts: item.extraCosts,
            unitCost: Math.round(unitCost),
            sellingPrice: item.sellingPrice,
            expiredDate: item.expiredDate ? new Date(item.expiredDate) : null,
          })
          .returning();

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

          // Update stock on the matching product variant
          if (item.variantLabel) {
            const existingVariant = product.variants.find(
              (v: any) => v.label === item.variantLabel,
            );

            if (existingVariant) {
              await tx
                .update(schema.productVariants)
                .set({ 
                  stock: existingVariant.stock + item.qty,
                  hpp: Math.round(unitCost)
                })
                .where(eq(schema.productVariants.id, existingVariant.id));
            } else {
              // Auto-create variant if it doesn't exist
              await tx.insert(schema.productVariants).values({
                productId: item.productId,
                label: item.variantLabel,
                price: item.sellingPrice,
                hpp: Math.round(unitCost),
                stock: item.qty,
                expiredDate: item.expiredDate ? new Date(item.expiredDate) : null,
              });
            }
          }
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
            // Decrement stock on the matching product variant
            if (item.variantLabel) {
              const matchingVariant = product.variants.find(
                (v: any) => v.label === item.variantLabel,
              );
              if (matchingVariant) {
                await tx
                  .update(schema.productVariants)
                  .set({ stock: Math.max(0, matchingVariant.stock - item.qty) })
                  .where(eq(schema.productVariants.id, matchingVariant.id));
              }
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
              totalCost: item.totalCost,
              extraCosts: item.extraCosts,
              unitCost: Math.round(unitCost),
              sellingPrice: item.sellingPrice,
              expiredDate: item.expiredDate ? new Date(item.expiredDate) : null,
            })
            .returning();

          if (willBeCompleted) {
            const product = await tx.query.products.findFirst({
              where: eq(schema.products.id, item.productId),
              with: { variants: true },
            });

            if (!product) {
              throw new NotFoundException(`Produk dengan ID ${item.productId} tidak ditemukan`);
            }

            const totalCurrentStock = product.variants.reduce((acc, v: any) => acc + v.stock, 0);
            // Update stock on the matching product variant

            // Update stock on the matching product variant
            if (item.variantLabel) {
              const existingVariant = product.variants.find(
                (v: any) => v.label === item.variantLabel,
              );

              if (existingVariant) {
                await tx
                  .update(schema.productVariants)
                  .set({ 
                    stock: existingVariant.stock + item.qty,
                    hpp: Math.round(unitCost)
                  })
                  .where(eq(schema.productVariants.id, existingVariant.id));
              } else {
                await tx.insert(schema.productVariants).values({
                  productId: item.productId,
                  label: item.variantLabel,
                  price: item.sellingPrice,
                  hpp: Math.round(unitCost),
                  stock: item.qty,
                  expiredDate: item.expiredDate ? new Date(item.expiredDate) : null,
                });
              }
            }
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
            // Update stock on the matching product variant

            // Update stock on the matching product variant
            // Update stock on the matching product variant
            if (item.variantLabel) {
              const existingVariant = product.variants.find(
                (v: any) => v.label === item.variantLabel,
              );

              if (existingVariant) {
                await tx
                  .update(schema.productVariants)
                  .set({ 
                    stock: existingVariant.stock + item.qty,
                    hpp: Math.round(unitCost)
                  })
                  .where(eq(schema.productVariants.id, existingVariant.id));
              } else {
                await tx.insert(schema.productVariants).values({
                  productId: item.productId,
                  label: item.variantLabel,
                  price: item.sellingPrice,
                  hpp: Math.round(unitCost),
                  stock: item.qty,
                  expiredDate: item.expiredDate ? new Date(item.expiredDate) : null,
                });
              }
            }
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
}
