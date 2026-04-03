import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './src/db/schema';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool, { schema });

async function listCategories() {
  const categories = await db.query.expenseCategories.findMany();
  console.log('--- EXPENSE CATEGORIES ---');
  console.log(JSON.stringify(categories, null, 2));
  await pool.end();
}

listCategories();
