/**
 * SKU Generator Utility
 * Generates SKUs in the format "PNS-XXXXXX" (e.g., PNS-000001)
 */

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
