import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DRIZZLE_DB } from '../../common/database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import { StockService } from '../stock/stock.service';
import { CreateEventDto } from './dto/create-event.dto';
import { AllocateEventStockDto } from './dto/allocate-event-stock.dto';
import { ReturnEventStockDto } from './dto/return-event-stock.dto';

@Injectable()
export class EventsService {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly stockService: StockService,
  ) {}

  async create(dto: CreateEventDto) {
    const [event] = await this.db
      .insert(schema.events)
      .values({
        name: dto.name,
        type: dto.type,
        description: dto.description,
        status: 'OPEN',
      })
      .returning();
    return event;
  }

  async findAll() {
    return this.db.query.events.findMany({
      orderBy: (events, { desc }) => [desc(events.createdAt)],
    });
  }

  async findOne(id: string) {
    const event = await this.db.query.events.findFirst({
      where: eq(schema.events.id, id),
      with: {
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

    if (!event) {
      throw new NotFoundException(`Event dengan ID ${id} tidak ditemukan`);
    }

    return event;
  }

  async allocateStock(eventId: string, dto: AllocateEventStockDto) {
    const event = await this.findOne(eventId);
    if (event.status === 'CLOSED') {
      throw new BadRequestException('Tidak dapat mengalokasikan stok ke event yang sudah ditutup');
    }

    return await this.db.transaction(async (tx) => {
      for (const item of dto.items) {
        // 1. Deduct from main stock (using StockService for ledger integrity)
        await this.stockService.recordMovement(tx, {
          productVariantId: item.productVariantId,
          type: 'EVENT_ALLOCATION',
          quantity: -item.quantity,
          referenceId: eventId,
          note: `Alokasi stok untuk event: ${event.name}`,
        });

        // 2. Update event bucket
        const existingEventItem = await tx.query.eventItems.findFirst({
          where: and(
            eq(schema.eventItems.eventId, eventId),
            eq(schema.eventItems.productVariantId, item.productVariantId),
          ),
        });

        if (existingEventItem) {
          await tx
            .update(schema.eventItems)
            .set({ stock: existingEventItem.stock + item.quantity })
            .where(eq(schema.eventItems.id, existingEventItem.id));
        } else {
          await tx.insert(schema.eventItems).values({
            eventId,
            productVariantId: item.productVariantId,
            stock: item.quantity,
          });
        }
      }

      return { message: 'Alokasi stok berhasil' };
    });
  }

  async returnStock(eventId: string, dto: ReturnEventStockDto) {
    const event = await this.findOne(eventId);

    return await this.db.transaction(async (tx) => {
      let itemsToReturn = dto.items;

      // Bulky mode: If no specific items provided, return ALL remaining stock in this event
      if (!itemsToReturn || itemsToReturn.length === 0) {
        const allEventItems = await tx.query.eventItems.findMany({
          where: eq(schema.eventItems.eventId, eventId),
        });
        itemsToReturn = allEventItems.map((item) => ({
          productVariantId: item.productVariantId,
          quantity: item.stock,
        }));
      }

      for (const item of itemsToReturn) {
        if (item.quantity <= 0) continue;

        const eventItem = await tx.query.eventItems.findFirst({
          where: and(
            eq(schema.eventItems.eventId, eventId),
            eq(schema.eventItems.productVariantId, item.productVariantId),
          ),
        });

        if (!eventItem || eventItem.stock < item.quantity) {
          throw new BadRequestException(
            `Stok event tidak mencukupi untuk varian ${item.productVariantId}. ` +
            `Tersedia: ${eventItem?.stock || 0}, Diminta: ${item.quantity}`,
          );
        }

        // 1. Return to main stock (ledger-tracked)
        await this.stockService.recordMovement(tx, {
          productVariantId: item.productVariantId,
          type: 'EVENT_RETURN',
          quantity: item.quantity,
          referenceId: eventId,
          note: `Pengembalian stok dari event: ${event.name}`,
        });

        // 2. Decrease event bucket
        await tx
          .update(schema.eventItems)
          .set({ stock: eventItem.stock - item.quantity })
          .where(eq(schema.eventItems.id, eventItem.id));
      }

      return { message: 'Pengembalian stok berhasil' };
    });
  }

  async updateStatus(id: string, status: 'OPEN' | 'CLOSED') {
    await this.findOne(id); // Validates event exists

    const [updated] = await this.db
      .update(schema.events)
      .set({ status })
      .where(eq(schema.events.id, id))
      .returning();
    
    return updated;
  }

  async getReport(id: string) {
    const event = await this.findOne(id);

    // 1. Get all orders for this event
    const eventOrders = await this.db.query.orders.findMany({
      where: eq(schema.orders.eventId, id),
      with: {
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

    const totalSales = eventOrders.reduce((sum, order) => sum + order.totalAmount, 0);
    const orderCount = eventOrders.length;

    // 2. Aggregate items sold
    const itemSummaries: Record<string, { 
      productVariantId: string;
      name: string; 
      package: string; 
      sold: number; 
      allocated: number;
      remaining: number;
    }> = {};

    // Initial state from event_items (current remaining stock)
    const eventItems = await this.db.query.eventItems.findMany({
      where: eq(schema.eventItems.eventId, id),
      with: {
        productVariant: {
          with: {
            product: true,
          },
        },
      },
    });

    for (const ei of eventItems) {
      const key = ei.productVariantId;
      itemSummaries[key] = {
        productVariantId: key,
        name: ei.productVariant.product.name,
        package: ei.productVariant.package,
        sold: 0,
        allocated: 0, // Will calculate: current stock + sold
        remaining: ei.stock,
      };
    }

    // Add sales data
    for (const order of eventOrders) {
      if (order.status === 'CANCELLED' || order.status === 'FAILED') continue;
      for (const item of order.items) {
        const key = item.productVariantId;
        if (itemSummaries[key]) {
          itemSummaries[key].sold += item.quantity;
        } else {
          itemSummaries[key] = {
            productVariantId: key,
            name: item.productVariant.product.name,
            package: item.productVariant.package,
            sold: item.quantity,
            allocated: 0,
            remaining: 0,
          };
        }
      }
    }

    // Finalize Reconciliation: Allocated = Remaining + Sold
    for (const key in itemSummaries) {
      itemSummaries[key].allocated = itemSummaries[key].remaining + itemSummaries[key].sold;
    }

    return {
      event: {
        id: event.id,
        name: event.name,
        status: event.status,
      },
      summary: {
        totalSales,
        orderCount,
      },
      items: Object.values(itemSummaries),
    };
  }
}
