import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE_DB } from '../../common/database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../db/schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class ProductsService {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async findAll() {
    return this.db.query.products.findMany({
      with: {
        variants: true,
      },
    });
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
