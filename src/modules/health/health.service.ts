import { Inject, Injectable, Logger } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DRIZZLE_DB } from '../../common/database/database.module';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(@Inject(DRIZZLE_DB) private readonly db: any) {}

  async checkDatabase() {
    try {
      await this.db.execute(sql`SELECT 1`);
      return 'ok';
    } catch (error) {
      this.logger.error('Database health check failed', error);
      return 'unreachable';
    }
  }
}
