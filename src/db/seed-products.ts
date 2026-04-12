import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema';
import * as crypto from 'crypto';
import * as dotenv from 'dotenv';
import { eq, and } from 'drizzle-orm';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool, { schema });

interface CsvProductRow {
  no: string;
  updatedDate: string;
  namaBarang: string;
  brand: string;
  supplier: string;
  kgPerBal: number;
  hargaPokok: number;
  pokokPerKg: number;
  balPrice: number | null;
  balMargin: number | null;
  oneKgPrice: number | null;
  oneKgMargin: number | null;
  fiveHundredGrPrice: number | null;
  fiveHundredGrMargin: number | null;
  twoFiftyGrPrice: number | null;
  twoFiftyGrMargin: number | null;
  grPer10rb: number | null;
  grPer10rbMargin: number | null;
  grPer5rb: number | null;
  grPer5rbMargin: number | null;
}

function parseCurrency(value: string): number | null {
  const cleaned = value.replace(/Rp/g, '').replace(/\./g, '').replace(/,/g, '').trim();
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? null : num;
}

function parseNumber(value: string): number | null {
  const cleaned = value.replace(/,/g, '.').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCsv(filePath: string): CsvProductRow[] {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');
  const dataLines = lines.slice(1);

  return dataLines
    .map((line) => {
      const cols = parseCsvLine(line);
      return {
        no: cols[0] || '',
        updatedDate: cols[1] || '',
        namaBarang: cols[2] || '',
        brand: cols[3] || '',
        supplier: cols[4] || '',
        kgPerBal: parseNumber(cols[5] || '') ?? 0,
        hargaPokok: parseCurrency(cols[6] || '') ?? 0,
        pokokPerKg: parseCurrency(cols[7] || '') ?? 0,
        balPrice: parseCurrency(cols[9] || ''),
        balMargin: parseNumber(cols[8] || ''),
        oneKgPrice: parseCurrency(cols[11] || ''),
        oneKgMargin: parseNumber(cols[10] || ''),
        fiveHundredGrPrice: parseCurrency(cols[13] || ''),
        fiveHundredGrMargin: parseNumber(cols[12] || ''),
        twoFiftyGrPrice: parseCurrency(cols[15] || ''),
        twoFiftyGrMargin: parseNumber(cols[14] || ''),
        grPer10rb: parseNumber(cols[16] || ''),
        grPer10rbMargin: parseNumber(cols[17] || ''),
        grPer5rb: parseNumber(cols[18] || ''),
        grPer5rbMargin: parseNumber(cols[19] || ''),
      };
    })
    .filter((row) => row.namaBarang !== '');
}

function calculateHpp(price: number, marginPct: number | null): number {
  if (!marginPct || price <= 0) return 0;
  return Math.floor((price * (100 - marginPct)) / 100);
}

function formatSku(counter: number): string {
  return `PNS-${String(counter).padStart(6, '0')}`;
}

async function seedProducts() {
  console.log('🌱 Seeding products from CSV...');

  try {
    const csvPath = join(__dirname, '../../data/products.csv');
    const rows = parseCsv(csvPath);
    console.log(`📖 Parsed ${rows.length} rows from CSV`);

    const brandMap = new Map<string, string>();
    const uniqueBrands = [...new Set(rows.map((r) => r.brand))];

    console.log(`\n🏢 Processing ${uniqueBrands.length} brands...`);
    for (const brandName of uniqueBrands) {
      const existing = await db.query.brands.findFirst({
        where: eq(schema.brands.name, brandName),
      });

      if (existing) {
        brandMap.set(brandName, existing.id);
        console.log(`⏭️ Brand exists: ${brandName}`);
      } else {
        const id = crypto.randomUUID();
        await db.insert(schema.brands).values({ id, name: brandName });
        brandMap.set(brandName, id);
        console.log(`✅ Created brand: ${brandName}`);
      }
    }

    const supplierMap = new Map<string, string>();
    const uniqueSuppliers = [...new Set(rows.map((r) => r.supplier))];

    console.log(`\n🚚 Processing ${uniqueSuppliers.length} suppliers...`);
    for (const supplierName of uniqueSuppliers) {
      const existing = await db.query.suppliers.findFirst({
        where: eq(schema.suppliers.name, supplierName),
      });

      if (existing) {
        supplierMap.set(supplierName, existing.id);
        console.log(`⏭️ Supplier exists: ${supplierName}`);
      } else {
        const id = crypto.randomUUID();
        await db.insert(schema.suppliers).values({
          id,
          name: supplierName,
          isActive: true,
        });
        supplierMap.set(supplierName, id);
        console.log(`✅ Created supplier: ${supplierName}`);
      }
    }

    let productsSkipped = 0;
    let productsCreated = 0;
    let variantsInserted = 0;
    let variantsUpdated = 0;
    let variantsSkipped = 0;

    const existingVariants = await db.query.productVariants.findMany({
      columns: { sku: true },
    });
    let skuCounter = existingVariants.length + 1;

    console.log(`\n📦 Processing ${rows.length} products...`);
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const brandId = brandMap.get(row.brand) ?? null;

      const existingProduct = await db.query.products.findFirst({
        where: and(
          eq(schema.products.name, row.namaBarang),
          brandId
            ? eq(schema.products.brandId, brandId)
            : eq(schema.products.brandId, null as unknown as string),
        ),
      });

      let productId: string;

      if (existingProduct) {
        productId = existingProduct.id;
        productsSkipped++;
        console.log(`⏭️ [${i + 1}/${rows.length}] Product exists: ${row.namaBarang}`);
      } else {
        productId = crypto.randomUUID();
        await db.insert(schema.products).values({
          id: productId,
          name: row.namaBarang,
          brandId,
          taste: [],
          isActive: true,
        });
        productsCreated++;
        console.log(`✅ [${i + 1}/${rows.length}] Created product: ${row.namaBarang}`);
      }

      const variantDefs: Array<{
        pkg: string;
        price: number | null;
        margin: number | null;
        sizeInGram: number | null;
      }> = [
        {
          pkg: 'bal',
          price: row.balPrice,
          margin: row.balMargin,
          sizeInGram: row.kgPerBal > 0 ? Math.round(row.kgPerBal * 1000) : null,
        },
        { pkg: '1kg', price: row.oneKgPrice, margin: row.oneKgMargin, sizeInGram: 1000 },
        {
          pkg: '500gr',
          price: row.fiveHundredGrPrice,
          margin: row.fiveHundredGrMargin,
          sizeInGram: 500,
        },
        { pkg: '250gr', price: row.twoFiftyGrPrice, margin: row.twoFiftyGrMargin, sizeInGram: 250 },
        { pkg: 'Small', price: 10000, margin: row.grPer10rbMargin, sizeInGram: row.grPer10rb },
        { pkg: 'Medium', price: 5000, margin: row.grPer5rbMargin, sizeInGram: row.grPer5rb },
      ];

      for (const vDef of variantDefs) {
        if (!vDef.price || vDef.price <= 0) {
          variantsSkipped++;
          continue;
        }

        const hpp = calculateHpp(vDef.price, vDef.margin);
        const sku = formatSku(skuCounter);

        const existingVariant = await db.query.productVariants.findFirst({
          where: and(
            eq(schema.productVariants.productId, productId),
            eq(
              schema.productVariants.package,
              vDef.pkg as (typeof schema.productVariantLabelEnum.enumValues)[number],
            ),
          ),
        });

        if (existingVariant) {
          await db
            .update(schema.productVariants)
            .set({
              price: vDef.price,
              hpp,
              sizeInGram: vDef.sizeInGram,
            })
            .where(eq(schema.productVariants.id, existingVariant.id));
          variantsUpdated++;
        } else {
          await db.insert(schema.productVariants).values({
            id: crypto.randomUUID(),
            productId,
            package: vDef.pkg as (typeof schema.productVariantLabelEnum.enumValues)[number],
            price: vDef.price,
            hpp,
            stock: 0,
            sku,
            sizeInGram: vDef.sizeInGram,
          });
          variantsInserted++;
          skuCounter++;
        }
      }
    }

    console.log('\n✨ Seeding completed!');
    console.log(`📦 Products created: ${productsCreated}`);
    console.log(`⏭️ Products skipped (exists): ${productsSkipped}`);
    console.log(`🏷️ Variants inserted: ${variantsInserted}`);
    console.log(`🔄 Variants updated: ${variantsUpdated}`);
    console.log(`⏭️ Variants skipped (no price): ${variantsSkipped}`);
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
