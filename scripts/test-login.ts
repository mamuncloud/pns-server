import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from '../src/db/schema';
import { eq } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import * as crypto from 'crypto';

dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const db = drizzle(pool, { schema });

async function createTestToken() {
  const manager = await db.query.employees.findFirst({
    where: eq(schema.employees.email, 'planetnyemilsnack@gmail.com'),
  });

  if (!manager) {
    console.error('❌ Manager not found!');
    process.exit(1);
  }

  const token = 'test-token-' + crypto.randomBytes(8).toString('hex');
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1);

  await db.insert(schema.authTokens).values({
    employeeId: manager.id,
    token: token,
    expiresAt: expiresAt,
  });

  console.log(`✅ Login URL: http://localhost:3000/staff/verify?token=${token}`);
  process.exit(0);
}

createTestToken();
