import { Client } from 'pg';
import 'dotenv/config';

async function main() {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL or DIRECT_URL not set in .env');
  }

  const client = new Client({
    connectionString,
  });

  try {
    await client.connect();
    console.log('Connected to database');

    console.log('Adding new enum values...');
    await client.query(`ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'EDC_BCA';`);
    await client.query(`ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'MAYAR';`);
    // Reconnect to ensure the new values are fully committed and visible to this session sometimes
  } catch (error) {
    console.error('Error adding enum values:', error);
  } finally {
    await client.end();
  }

  // Create a new client connection for the next phase
  const client2 = new Client({ connectionString });
  try {
    await client2.connect();
    
    console.log('Migrating QRIS data to MAYAR...');
    await client2.query(`UPDATE "orders" SET "paymentMethod" = 'MAYAR' WHERE "paymentMethod" = 'QRIS';`);
    await client2.query(`UPDATE "financial_transactions" SET "paymentMethod" = 'MAYAR' WHERE "paymentMethod" = 'QRIS';`);

    console.log('Recreating enum and dropping old QRIS value...');
    await client2.query(`
      CREATE TYPE "PaymentMethod_new" AS ENUM ('CASH', 'EDC_BCA', 'MAYAR');
      
      -- Drop defaults before casting
      ALTER TABLE "orders" ALTER COLUMN "paymentMethod" DROP DEFAULT;
      ALTER TABLE "financial_transactions" ALTER COLUMN "paymentMethod" DROP DEFAULT;
      
      -- Change type
      ALTER TABLE "orders" ALTER COLUMN "paymentMethod" TYPE "PaymentMethod_new" USING "paymentMethod"::text::"PaymentMethod_new";
      ALTER TABLE "financial_transactions" ALTER COLUMN "paymentMethod" TYPE "PaymentMethod_new" USING "paymentMethod"::text::"PaymentMethod_new";
      
      -- Drop old enum and rename
      DROP TYPE "PaymentMethod";
      ALTER TYPE "PaymentMethod_new" RENAME TO "PaymentMethod";
      
      -- Restore defaults
      ALTER TABLE "orders" ALTER COLUMN "paymentMethod" SET DEFAULT 'CASH'::"PaymentMethod";
      ALTER TABLE "financial_transactions" ALTER COLUMN "paymentMethod" SET DEFAULT 'CASH'::"PaymentMethod";
    `);
    
    console.log('Migration executed successfully.');

  } catch (error) {
    console.error('Error executing migration logic:', error);
    process.exit(1);
  } finally {
    await client2.end();
  }
}

main();
