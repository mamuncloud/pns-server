import { DRIZZLE_DB } from '../src/common/database/database.module';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { sql } from 'drizzle-orm';

async function migrate() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const db = app.get(DRIZZLE_DB);

  console.log('Adding expiresAt column to payments table...');
  try {
    await db.execute(sql`ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "expiresAt" timestamp;`);
    console.log('Successfully added expiresAt column.');
  } catch (error) {
    console.error('Error adding column:', error);
  } finally {
    await app.close();
  }
}

migrate();
