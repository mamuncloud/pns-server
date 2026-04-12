import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema';
import * as crypto from 'crypto';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool, { schema });

async function seed() {
  console.log('🌱 Seeding database...');

  try {
    await db.delete(schema.orderItems);
    await db.delete(schema.repacks);
    await db.delete(schema.purchaseItems);
    await db.delete(schema.stockMovements);
    await db.delete(schema.expenses);
    await db.delete(schema.financialTransactions);
    await db.delete(schema.pricingRules);
    await db.delete(schema.orders);
    await db.delete(schema.purchases);
    await db.delete(schema.productVariants);
    await db.delete(schema.products);
    await db.delete(schema.expenseCategories);
    await db.delete(schema.users);
    await db.delete(schema.brands);
    await db.delete(schema.suppliers);
    await db.delete(schema.storeSettings);

    const tastes = ['PEDAS', 'GURIH', 'MANIS'];
    const labels = ['Medium', 'Small', '250gr', '500gr', '1kg', 'bal'];
    const snackNames = [
      'Keripik Kaca',
      'Makaroni Ngocor',
      'Basreng Gila',
      'Usus Pedas',
      'Cireng Krispi',
      'Lidi-lidian',
      'Batagor Kuah',
      'Pilus Gurih',
      'Kacang Atom',
      'Emping Manis',
      'Kerupuk Seblak',
      'Mie Lidi',
      'Susu Goreng',
      'Tahu Bulat',
      'Otak-otak Krispi',
    ];

    const productsToInsert = [];

    console.log('📦 Generating 100 products...');
    for (let i = 1; i <= 100; i++) {
      const baseName = snackNames[Math.floor(Math.random() * snackNames.length)];
      const productName = `${baseName} Varian ${i}`;

      const productTaste = [tastes[Math.floor(Math.random() * tastes.length)]];
      if (Math.random() > 0.7) {
        const extraTaste = tastes[Math.floor(Math.random() * tastes.length)];
        if (!productTaste.includes(extraTaste)) {
          productTaste.push(extraTaste);
        }
      }

      productsToInsert.push({
        id: crypto.randomUUID(),
        name: productName,
        description: `${productName} adalah snack favorit dengan rasa ${productTaste.join(' & ')}. Dibuat dari bahan pilihan berkualitas tinggi.`,
        imageUrl: `https://picsum.photos/seed/${i}/400/400`, // Random placeholder image
        taste: productTaste,
        isActive: true,
      });
    }

    // Insert products in chunks to be safe
    await db.insert(schema.products).values(productsToInsert);
    console.log(`✅ Inserted ${productsToInsert.length} products.`);

    const variantsToInsert = [];
    console.log('🏷️ Generating variants...');
    for (const product of productsToInsert) {
      const numVariants = Math.floor(Math.random() * 3) + 1;
      const shuffledLabels = [...labels].sort(() => 0.5 - Math.random());
      const selectedLabels = shuffledLabels.slice(0, numVariants);

      for (const label of selectedLabels) {
        variantsToInsert.push({
          id: crypto.randomUUID(),
          productId: product.id,
          package: label,
          price: (Math.floor(Math.random() * 10) + 2) * 5000, // 10000 to 60000
          stock: Math.floor(Math.random() * 100) + 10,
          sku: `SKU-${product.name.replace(/\s+/g, '-').toUpperCase()}-${label.toUpperCase()}-${Math.floor(Math.random() * 1000)}`,
        });
      }
    }

    await db.insert(schema.productVariants).values(variantsToInsert);
    console.log(`✅ Inserted ${variantsToInsert.length} product variants.`);

    console.log('💰 Seeding expense categories...');
    const expenseCategories = [
      { name: 'Listrik & Air', description: 'Biaya utilitas bulanan' },
      { name: 'Sewa Bangunan', description: 'Biaya sewa toko' },
      { name: 'Gaji Karyawan', description: 'Pembayaran upah staf' },
      { name: 'Perlengkapan Toko', description: 'ATK, pembersih, dll' },
      { name: 'Logistik', description: 'Biaya pengiriman dan transportasi' },
      { name: 'Pemasaran', description: 'Iklan dan promosi' },
      { name: 'Lain-lain', description: 'Biaya tidak terduga lainnya' },
    ];

    await db.insert(schema.expenseCategories).values(
      expenseCategories.map((cat) => ({
        id: crypto.randomUUID(),
        ...cat,
      })),
    );
    console.log(`✅ Inserted ${expenseCategories.length} expense categories.`);

    console.log('✨ Seeding completed successfully!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
