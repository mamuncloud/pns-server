import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from '../src/db/schema';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const db = drizzle(pool, { schema });

async function checkEmployees() {
  const allEmployees = await db.query.employees.findMany();
  console.log('Employees in DB:', JSON.stringify(allEmployees, null, 2));
  process.exit(0);
}

checkEmployees();
