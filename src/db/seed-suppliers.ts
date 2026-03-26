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

async function seedSuppliers() {
  console.log('🌱 Seeding suppliers...');

  try {
    const suppliersToInsert = [
      {
        name: 'PT Snack Jaya Abadi',
        contactName: 'Budi Santoso',
        email: 'budi@snackjaya.co.id',
        phone: '081234567890',
        address: 'Jl. Industri Raya No. 10, Jakarta Timur',
        isActive: true,
      },
      {
        name: 'CV Kripik Bu Tini',
        contactName: 'Tini Wulandari',
        email: 'tini@kripikbutini.com',
        phone: '081234567891',
        address: 'Jl. Pasar Kwangungan No. 25, Bandung',
        isActive: true,
      },
      {
        name: 'UD Makaroni Enak',
        contactName: 'Ahmad Fauzi',
        email: 'ahmad@makaronienak.id',
        phone: '081234567892',
        address: 'Jl. Desa Makmur No. 8, Yogyakarta',
        isActive: true,
      },
      {
        name: 'PT Gorengan Nusantara',
        contactName: 'Dewi Lestari',
        email: 'dewi@gorenganusantara.com',
        phone: '081234567893',
        address: 'Jl. Raya Solo No. 45, Surakarta',
        isActive: true,
      },
      {
        name: 'CV Basreng Gila',
        contactName: 'Rudi Hermawan',
        email: 'rudi@basrenggila.co.id',
        phone: '081234567894',
        address: 'Jl. Pengumben No. 12, Jakarta Barat',
        isActive: true,
      },
      {
        name: 'UD Keripik Kaca Prima',
        contactName: 'Siti Nurhaliza',
        email: 'siti@keripikkaca.com',
        phone: '081234567895',
        address: 'Jl. Braga No. 33, Bandung',
        isActive: true,
      },
      {
        name: 'PT Cemilan Indonesia',
        contactName: 'Hendra Wijaya',
        email: 'hendra@cemilanindonesia.com',
        phone: '081234567896',
        address: 'Jl. Merdeka No. 100, Semarang',
        isActive: true,
      },
      {
        name: 'CV Pilus Gurih Sejahtera',
        contactName: 'Maya Sari',
        email: 'maya@pilusgurih.com',
        phone: '081234567897',
        address: 'Jl. Ahmad Yani No. 55, Surabaya',
        isActive: true,
      },
      {
        name: 'UD Kacang Atom Enak',
        contactName: 'Joko Susilo',
        email: 'joko@kacangatom.com',
        phone: '081234567898',
        address: 'Jl. Veteran No. 7, Malang',
        isActive: true,
      },
      {
        name: 'PT Snack Internasional',
        contactName: 'Lisa Permatasari',
        email: 'lisa@snackinternasional.co.id',
        phone: '081234567899',
        address: 'Jl. Gatot Subroto No. 88, Jakarta Selatan',
        isActive: true,
      },
    ];

    for (const supplier of suppliersToInsert) {
      try {
        const existing = await db.query.suppliers.findFirst({
          where: eq(schema.suppliers.email, supplier.email as string),
        });

        if (!existing) {
          const id = crypto.randomUUID();
          await db.insert(schema.suppliers).values({ ...supplier, id });
          console.log(`✅ Inserted supplier: ${supplier.name}`);
        } else {
          console.log(`⚠️ Supplier ${supplier.email} already exists, skipping...`);
        }
      } catch (e) {
        console.error(`❌ Error seeding ${supplier.email}:`, e);
      }
    }

    console.log('✨ Supplier seeding completed!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    await pool.end();
  }
}

seedSuppliers();
