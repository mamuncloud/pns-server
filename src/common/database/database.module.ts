import { Global, Module, OnApplicationShutdown, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from '../../db/schema';

export const DRIZZLE_DB = 'DRIZZLE_DB';
const PG_POOL = 'PG_POOL';

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get<string>('DATABASE_URL');
        if (!databaseUrl) {
          throw new Error('DATABASE_URL is not defined');
        }
        return new pg.Pool({
          connectionString: databaseUrl,
        });
      },
    },
    {
      provide: DRIZZLE_DB,
      inject: [PG_POOL],
      useFactory: (pool: pg.Pool) => {
        return drizzle(pool, {
          schema,
          logger: false,
        });
      },
    },
  ],
  exports: [DRIZZLE_DB],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(PG_POOL) private readonly pool: pg.Pool) {}

  async onApplicationShutdown(signal?: string) {
    console.log(`\nDetected shutdown signal: ${signal}`);
    await this.pool.end();
    console.log('Cleanup complete. Application shutting down.');
  }
}
