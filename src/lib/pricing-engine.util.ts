/**
 * Core Pricing Engine Logic
 * Based on PRD Financial Intelligence Layer
 */

/**
 * Forward Pricing (Weight-based)
 * price = ROUNDUP(packaging_cost + (cost_per_gram * weight * (1 + margin)), rounding)
 */
export function calculateForwardPricing(
  costPerGram: number,
  weight: number,
  packagingCost: number = 0,
  marginPct: number,
  rounding: number = 100
): number {
  const marginMultiplier = 1 + marginPct / 100;
  const basePrice = packagingCost + costPerGram * weight * marginMultiplier;
  
  // Handle floating point issues by rounding to 4 decimal places before ceil
  const precisionPrice = Math.round(basePrice * 10000) / 10000;
  
  if (rounding <= 0) return Math.ceil(precisionPrice);
  
  return Math.ceil(precisionPrice / rounding) * rounding;
}

/**
 * Reverse Pricing (Fixed price target)
 * weight = (target_price - packaging_cost) / (cost_per_gram * (1 + margin))
 */
export function calculateReversePricing(
  targetPrice: number,
  costPerGram: number,
  packagingCost: number = 0,
  marginPct: number
): number {
  const marginMultiplier = 1 + marginPct / 100;
  const denominator = costPerGram * marginMultiplier;
  
  if (denominator <= 0) return 0;
  
  const calculatedWeight = (targetPrice - packagingCost) / denominator;
  // Handle floating point issues by rounding before floor
  const precisionWeight = Math.round(calculatedWeight * 10000) / 10000;
  return Math.max(0, Math.floor(precisionWeight));
}

/**
 * Bulk Pricing (/bal)
 * price = ROUNDUP(base_cost * (1 + margin), rounding)
 */
export function calculateBulkPricing(
  baseCost: number,
  marginPct: number,
  rounding: number = 100
): number {
  const marginMultiplier = 1 + marginPct / 100;
  const basePrice = baseCost * marginMultiplier;
  
  const precisionPrice = Math.round(basePrice * 10000) / 10000;
  
  if (rounding <= 0) return Math.ceil(precisionPrice);
  
  return Math.ceil(precisionPrice / rounding) * rounding;
}

/**
 * HPP Calculation (Weighted Average Cost)
 * new_hpp = (existing_stock * existing_hpp + new_qty * new_cost) / (existing_stock + new_qty)
 */
export function calculateNewHpp(
  existingStock: number,
  existingHpp: number,
  newQty: number,
  newCost: number
): number {
  const totalStock = existingStock + newQty;
  if (totalStock <= 0) return newCost;
  
  const totalCost = existingStock * existingHpp + newQty * newCost;
  return Math.round(totalCost / totalStock);
}
