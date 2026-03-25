import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE_DB } from '../../common/database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../db/schema';
import { eq, sql } from 'drizzle-orm';

@Injectable()
export class ProductsService {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async findAll(page: number = 1, limit: number = 10, taste?: string) {
    const offset = (page - 1) * limit;

    const where = taste ? sql`${schema.products.taste} @> ARRAY[${taste}]::text[]` : undefined;

    const data = await this.db.query.products.findMany({
      limit,
      offset,
      where,
      with: {
        variants: true,
        brand: true,
        pricingRules: true,
      },
      orderBy: (products, { desc }) => [desc(products.createdAt)],
    });

    const totalItemsResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schema.products)
      .where(where);
    const totalItems = Number(totalItemsResult[0].count);

    return {
      data,
      totalItems,
    };
  }

  async findOne(id: string) {
    return this.db.query.products.findFirst({
      where: eq(schema.products.id, id),
      with: {
        variants: true,
        brand: true,
        pricingRules: true,
      },
    });
  }
}
