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
    // Clear existing data in correct order
    console.log('🧹 Cleaning existing data...');
    await db.delete(schema.orderItems);
    await db.delete(schema.productVariants);
    await db.delete(schema.products);

    const tastes = ['Pedas', 'Gurih', 'Manis'];
    const labels = ['250gr', '500gr', '1kg', 'Medium', 'Small', 'Grocery'];
    const snackNames = [
      'Keripik Kaca', 'Makaroni Ngocor', 'Basreng Gila', 'Usus Pedas', 'Cireng Krispi',
      'Lidi-lidian', 'Batagor Kuah', 'Pilus Gurih', 'Kacang Atom', 'Emping Manis',
      'Kerupuk Seblak', 'Mie Lidi', 'Susu Goreng', 'Tahu Bulat', 'Otak-otak Krispi'
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
          label,
          price: (Math.floor(Math.random() * 10) + 2) * 5000, // 10000 to 60000
          stock: Math.floor(Math.random() * 100) + 10,
          sku: `SKU-${product.name.replace(/\s+/g, '-').toUpperCase()}-${label.toUpperCase()}-${Math.floor(Math.random() * 1000)}`,
        });
      }
    }

    await db.insert(schema.productVariants).values(variantsToInsert);
    console.log(`✅ Inserted ${variantsToInsert.length} product variants.`);

    console.log('✨ Seeding completed successfully!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
