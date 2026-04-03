/**
 * SKU Generator Utility
 * Generates SKUs in the format "PNS-XXXXXX" (e.g., PNS-000001)
 */

import { desc, isNotNull } from 'drizzle-orm';
import * as schema from '../db/schema';

export function generateNextSku(lastSku: string | null | undefined): string {
  if (!lastSku || !lastSku.startsWith('PNS-')) {
    return 'PNS-000001';
  }

  const numericPart = lastSku.replace('PNS-', '');
  const lastNumber = parseInt(numericPart, 10);

  if (isNaN(lastNumber)) {
    return 'PNS-000001';
  }

  const nextNumber = lastNumber + 1;
  return `PNS-${nextNumber.toString().padStart(6, '0')}`;
}

export async function getNextSkuFromDb(db: any): Promise<string> {
  const lastVariant = await db.query.productVariants.findFirst({
    columns: { sku: true },
    orderBy: [desc(schema.productVariants.sku)],
    where: isNotNull(schema.productVariants.sku),
  });

  return generateNextSku(lastVariant?.sku);
}
