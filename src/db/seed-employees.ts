import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema';
import * as crypto from 'crypto';
import * as dotenv from 'dotenv';

import { eq } from 'drizzle-orm';

dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool, { schema });

async function seedEmployees() {
  console.log('🌱 Seeding employees...');

  try {
    const employeesToInsert = [
      {
        id: crypto.randomUUID(),
        email: 'manager@pns.com',
        name: 'Manager One',
        role: 'MANAGER' as const,
      },
      {
        id: crypto.randomUUID(),
        email: 'cashier@pns.com',
        name: 'Cashier One',
        role: 'CASHIER' as const,
      },
    ];

    for (const employee of employeesToInsert) {
      try {
        const existing = await db.query.employees.findFirst({
          where: eq(schema.employees.email, employee.email),
        });

        if (!existing) {
          await db.insert(schema.employees).values(employee);
          console.log(`✅ Inserted employee: ${employee.email} (${employee.role})`);
        } else {
          console.log(`⚠️ Employee ${employee.email} already exists, skipping...`);
        }
      } catch (e) {
        console.error(`❌ Error seeding ${employee.email}:`, e);
      }
    }

    console.log('✨ Employee seeding completed!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    await pool.end();
  }
}

seedEmployees();
