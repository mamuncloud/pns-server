import { Client } from 'pg';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(__dirname, '../.env') });

async function migrate() {
  const client = new Client({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  });

  console.log('Connecting to database...');
  await client.connect();

  console.log('Adding expiresAt column to payments table...');
  try {
    await client.query('ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "expiresAt" timestamp;');
    console.log('Successfully added expiresAt column.');
  } catch (error) {
    console.error('Error adding column:', error);
  } finally {
    await client.end();
  }
}

migrate();
