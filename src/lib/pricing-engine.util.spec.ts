import { describe, it, expect } from 'bun:test';
import { calculateForwardPricing, calculateReversePricing, calculateBulkPricing, calculateNewHpp } from './pricing-engine.util';

describe('Pricing Engine Logic', () => {
  describe('calculateForwardPricing', () => {
    it('should calculate correct price with margin and rounding', () => {
      // cost 100, weight 10, margin 20%, packaging 1000, rounding 1000
      // formula: 1000 + (100 * 10 * 1.2) = 1000 + 1200 = 2200
      // rounding 1000 -> 3000
      const price = calculateForwardPricing(100, 10, 1000, 20, 1000);
      expect(price).toBe(3000);
    });

    it('should handle zero packaging cost', () => {
      const price = calculateForwardPricing(100, 500, 0, 20, 500);
      // 100 * 500 * 1.2 = 60000
      // rounding 500 -> 60000
      expect(price).toBe(60000);
    });
  });

  describe('calculateReversePricing', () => {
    it('should calculate correct weight for fixed target price', () => {
      // target 10000, packaging 1000, costPerGram 100, margin 20%
      // formula: (10000 - 1000) / (100 * 1.2) = 9000 / 120 = 75
      const weight = calculateReversePricing(10000, 100, 1000, 20);
      expect(weight).toBe(75);
    });

    it('should return floor value for weight', () => {
      // target 10000, packaging 0, costPerGram 30, margin 30%
      // (10000 - 0) / (30 * 1.3) = 10000 / 39 = 256.41...
      const weight = calculateReversePricing(10000, 30, 0, 30);
      expect(weight).toBe(256);
    });
  });

  describe('calculateBulkPricing', () => {
    it('should calculate correct bulk price', () => {
      // baseCost 50000, margin 10%, rounding 1000
      // 50000 * 1.1 = 55000 -> 55000
      const price = calculateBulkPricing(50000, 10, 1000);
      expect(price).toBe(55000);
    });
  });

  describe('calculateNewHpp', () => {
    it('should calculate correct weighted average HPP', () => {
      // existing 10 qty at 1000 HPP
      // new 5 qty at 1300 cost
      // formula: (10 * 1000 + 5 * 1300) / 15 = (10000 + 6500) / 15 = 16500 / 15 = 1100
      const hpp = calculateNewHpp(10, 1000, 5, 1300);
      expect(hpp).toBe(1100);
    });
  });
});
