import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema';
import * as crypto from 'crypto';
import * as dotenv from 'dotenv';
import { eq } from 'drizzle-orm';
import { readFileSync } from 'node:fs';

dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool, { schema });

interface CsvRow {
  namaBarang: string;
  brand: string;
  supplier: string;
}

function parseCsv(filePath: string): CsvRow[] {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');

  // Skip header row
  const dataLines = lines.slice(1);

  return dataLines.map((line) => {
    const columns = line.split(',');
    return {
      namaBarang: columns[0].trim(),
      brand: columns[1].trim(),
      supplier: columns[2].trim(),
    };
  });
}

async function seedProducts() {
  console.log('🌱 Seeding products from CSV...');

  try {
    const csvPath = '/Users/mamunsyuhada/vibecode/pns/product_seeder.csv';
    const rows = parseCsv(csvPath);
    console.log(`📖 Parsed ${rows.length} rows from CSV`);

    // 1. Get or create brands
    const brandMap = new Map<string, string>();
    const uniqueBrands = [...new Set(rows.map((r) => r.brand))];

    for (const brandName of uniqueBrands) {
      const existing = await db.query.brands.findFirst({
        where: eq(schema.brands.name, brandName),
      });

      if (existing) {
        brandMap.set(brandName, existing.id);
        console.log(`⚠️ Brand already exists: ${brandName}`);
      } else {
        const id = crypto.randomUUID();
        await db.insert(schema.brands).values({ id, name: brandName });
        brandMap.set(brandName, id);
        console.log(`✅ Created brand: ${brandName}`);
      }
    }

    // 2. Get or create suppliers (for reference, not directly linked in products table)
    const supplierMap = new Map<string, string>();
    const uniqueSuppliers = [...new Set(rows.map((r) => r.supplier))];

    for (const supplierName of uniqueSuppliers) {
      const existing = await db.query.suppliers.findFirst({
        where: eq(schema.suppliers.name, supplierName),
      });

      if (existing) {
        supplierMap.set(supplierName, existing.id);
        console.log(`⚠️ Supplier already exists: ${supplierName}`);
      } else {
        const id = crypto.randomUUID();
        await db.insert(schema.suppliers).values({
          id,
          name: supplierName,
          isActive: true,
        });
        console.log(`✅ Created supplier: ${supplierName}`);
      }
    }

    // 3. Create products and variants
    let productsCreated = 0;
    let variantsCreated = 0;

    for (const row of rows) {
      // Check if product already exists
      const existingProduct = await db.query.products.findFirst({
        where: eq(schema.products.name, row.namaBarang),
      });

      let productId: string;

      if (existingProduct) {
        productId = existingProduct.id;
        console.log(`⚠️ Product already exists: ${row.namaBarang}`);
      } else {
        productId = crypto.randomUUID();
        const brandId = brandMap.get(row.brand);

        await db.insert(schema.products).values({
          id: productId,
          name: row.namaBarang,
          brandId: brandId ?? null,
          taste: [],
          isActive: true,
        });
        productsCreated++;
        console.log(`✅ Created product: ${row.namaBarang}`);
      }

      // Check if variants already exist for this product
      const existingVariants = await db.query.productVariants.findMany({
        where: eq(schema.productVariants.productId, productId),
      });

      if (existingVariants.length > 0) {
        console.log(`⚠️ Variants already exist for: ${row.namaBarang}, skipping...`);
        continue;
      }

      // Create default variants (Medium, Small, 250gr)
      const defaultPackages = ['Medium', 'Small', '250gr'] as const;
      const defaultPrices: Record<string, number> = {
        Medium: 10000,
        Small: 5000,
        '250gr': 15000,
      };
      const defaultSizes: Record<string, number | null> = {
        Medium: null,
        Small: null,
        '250gr': 250,
      };

      for (const pkg of defaultPackages) {
        const variantId = crypto.randomUUID();
        const sku = `${row.namaBarang.substring(0, 3).toUpperCase()}-${pkg.toUpperCase()}-${crypto.randomUUID().substring(0, 6)}`;

        await db.insert(schema.productVariants).values({
          id: variantId,
          productId,
          package: pkg,
          price: defaultPrices[pkg],
          hpp: Math.floor(defaultPrices[pkg] * 0.7), // 70% of selling price
          stock: 50,
          sku,
          sizeInGram: defaultSizes[pkg],
        });
        variantsCreated++;
      }
    }

    // 4. Add product images
    const snackImages = [
      'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1621447504864-d8686e12698c?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1582037928769-181f2644ecb7?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1600952841320-db92ec4047ca?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1576107232684-1279f390859f?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1541592106381-b31e9677c0e4?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1613919113640-25732ec5e61f?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=400&h=400&fit=crop',
    ];

    let imagesAdded = 0;
    const allProducts = await db.query.products.findMany();

    for (const product of allProducts) {
      const productId = product.id as string;

      const existingImages = await db.query.productImages.findMany({
        where: eq(schema.productImages.productId, productId),
      });

      if (existingImages.length > 0) {
        continue;
      }

      const imageUrl = snackImages[imagesAdded % snackImages.length];
      await db.insert(schema.productImages).values({
        id: crypto.randomUUID(),
        productId,
        url: imageUrl,
        isPrimary: true,
      });
      imagesAdded++;
    }

    console.log(`\n✨ Seeding completed!`);
    console.log(`📦 Products created: ${productsCreated}`);
    console.log(`🏷️ Variants created: ${variantsCreated}`);
    console.log(`🖼️ Images added: ${imagesAdded}`);
    console.log(`🏢 Brands: ${uniqueBrands.length}`);
    console.log(`🚚 Suppliers: ${uniqueSuppliers.length}`);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seedProducts();
