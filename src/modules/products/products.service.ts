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

  async findAll(page: number = 1, limit: number = 10) {
    const offset = (page - 1) * limit;

    const data = await this.db.query.products.findMany({
      limit,
      offset,
      with: {
        variants: true,
      },
      orderBy: (products, { desc }) => [desc(products.createdAt)],
    });

    const totalItemsResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schema.products);
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
      },
    });
  }
}
