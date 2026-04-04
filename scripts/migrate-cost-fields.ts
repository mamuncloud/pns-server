import { Client } from "pg";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const client = new Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
  try {
    await client.connect();
    console.log("Connected. Applying migration...");

    await client.query(`
      ALTER TABLE "products" 
      ADD COLUMN IF NOT EXISTS "baseCostPerGram" integer DEFAULT 0 NOT NULL,
      ADD COLUMN IF NOT EXISTS "packagingCost" integer DEFAULT 0 NOT NULL;
    `);

    console.log("Migration complete! Added baseCostPerGram and packagingCost to products table.");
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
