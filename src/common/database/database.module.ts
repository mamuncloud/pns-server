import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from '../../db/schema';

export const DRIZZLE_DB = 'DRIZZLE_DB';

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE_DB,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get<string>('DATABASE_URL');
        if (!databaseUrl) {
          throw new Error('DATABASE_URL is not defined');
        }
        const pool = new pg.Pool({
          connectionString: databaseUrl,
        });
        return drizzle(pool, { schema });
      },
    },
  ],
  exports: [DRIZZLE_DB],
})
export class DatabaseModule {}
