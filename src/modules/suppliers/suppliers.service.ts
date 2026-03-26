import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE_DB } from '../../common/database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../db/schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class SuppliersService {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async findAll() {
    return this.db.query.suppliers.findMany({
      where: eq(schema.suppliers.isActive, true),
      orderBy: (suppliers, { asc }) => [asc(suppliers.name)],
    });
  }

  async findOne(id: string) {
    return this.db.query.suppliers.findFirst({
      where: eq(schema.suppliers.id, id),
    });
  }
}
