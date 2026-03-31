import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DRIZZLE_DB } from '../../common/database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../db/schema';
import { eq, desc } from 'drizzle-orm';
import { CreateConsignmentDto } from './dto/create-consignment.dto';
import { SettleConsignmentDto } from './dto/settle-consignment.dto';
import { StockService } from '../stock/stock.service';

@Injectable()
export class ConsignmentService {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly stockService: StockService,
  ) {}

  async create(dto: CreateConsignmentDto) {
    return await this.db.transaction(async (tx) => {
      const totalAmount = dto.items.reduce((acc, item) => acc + item.qtyReceived * item.unitCost, 0);

      const [consignment] = await tx.insert(schema.consignments).values({
        supplierId: dto.supplierId,
        date: new Date(dto.date),
        attachmentUrl: dto.attachmentUrl,
        note: dto.note,
        totalAmount,
        status: 'OPEN',
      }).returning();

      for (const item of dto.items) {
        await tx.insert(schema.consignmentItems).values({
          consignmentId: consignment.id,
          productVariantId: item.productVariantId,
          qtyReceived: item.qtyReceived,
          unitCost: item.unitCost,
        });

        // Record stock movement (IN)
        await this.stockService.recordMovement(tx, {
          productVariantId: item.productVariantId,
          type: 'CONSIGNMENT_IN',
          quantity: item.qtyReceived,
          referenceId: consignment.id,
          note: `Terima Titipan: ${consignment.id}`,
        });
      }

      return consignment;
    });
  }

  async findAll(search?: string) {
    const consignments = await this.db.query.consignments.findMany({
      with: {
        supplier: true,
        items: {
          with: {
            productVariant: {
              with: {
                product: true,
              },
            },
          },
        },
      },
      orderBy: [desc(schema.consignments.createdAt)],
    });

    if (!search) return consignments;

    return consignments.filter((consignment) =>
      consignment.supplier?.name?.toLowerCase().includes(search.toLowerCase())
    );
  }

  async findOne(id: string) {
    const consignment = await this.db.query.consignments.findFirst({
      where: eq(schema.consignments.id, id),
      with: {
        supplier: true,
        items: {
          with: {
            productVariant: {
              with: {
                product: true,
              },
            },
          },
        },
      },
    });

    if (!consignment) {
      throw new NotFoundException(`Nota konsinyasi ${id} tidak ditemukan`);
    }

    return consignment;
  }

  async settle(dto: SettleConsignmentDto) {
    return await this.db.transaction(async (tx) => {
      const consignment = await this.findOne(dto.consignmentId);
      if (consignment.status === 'CLOSED') {
        throw new BadRequestException('Nota konsinyasi ini sudah ditutup');
      }

      let totalAmountSettledDelta = 0;

      for (const itemDto of dto.items) {
        const item = consignment.items.find((i) => i.id === itemDto.id);
        if (!item) continue;

        const newReturned = itemDto.qtyReturned || 0;
        const currentStock = itemDto.currentStock;

        // Cumulative sold: Received - (Total Returned) - Current Physical Stock
        // item.qtyReturned is what was ALREADY returned. newReturned is NEW for this session.
        const totalReturnedSoFar = item.qtyReturned + newReturned;
        const cumulativeSold = item.qtyReceived - totalReturnedSoFar - currentStock;
        
        // This session's newly sold = cumulativeSold - alreadySettled
        const qtySettledDelta = cumulativeSold - item.qtySettled;

        if (qtySettledDelta < 0) {
          throw new BadRequestException(
            `Data penyelesaian tidak valid untuk ${item.productVariant?.product?.name}. ` +
            `Stok aktual (${currentStock}) melebihi sisa barang yang tersedia.`
          );
        }

        // Update item state
        await tx.update(schema.consignmentItems)
          .set({
            qtyReturned: totalReturnedSoFar,
            qtySettled: item.qtySettled + qtySettledDelta,
          })
          .where(eq(schema.consignmentItems.id, itemDto.id));

        totalAmountSettledDelta += qtySettledDelta * item.unitCost;

        // Record stock movement (OUT) for NEW returns only
        if (newReturned > 0) {
          await this.stockService.recordMovement(tx, {
            productVariantId: item.productVariantId,
            type: 'CONSIGNMENT_OUT',
            quantity: -newReturned,
            referenceId: consignment.id,
            note: `Retur Titipan: ${consignment.id} (${dto.note || 'No note'})`,
          });
        }

        // Check if this item is completely cleared
        // An item is cleared if (qtySettled + qtyReturned) == qtyReceived
        // Or simply if currentStock == 0
        // Update total amount settled for response
      }

      const newTotalSettled = Number(consignment.totalSettled) + totalAmountSettledDelta;
      
      // Robust status check: Is everything reconciled?
      const updatedItems = await tx.query.consignmentItems.findMany({
        where: eq(schema.consignmentItems.consignmentId, dto.consignmentId)
      });
      const isFullyCleared = updatedItems.every(
        i => (i.qtySettled + i.qtyReturned) === i.qtyReceived
      );
      const status = isFullyCleared ? 'CLOSED' : 'PARTIALLY_SETTLED';

      await tx.update(schema.consignments)
        .set({
          totalSettled: newTotalSettled,
          status,
          updatedAt: new Date(),
        })
        .where(eq(schema.consignments.id, dto.consignmentId));

      return { 
        message: status === 'CLOSED' ? 'Konsinyasi berhasil ditutup' : 'Penyelesaian parsial berhasil dicatat',
        totalAmountSettledDelta,
        status 
      };
    });
  }
}
