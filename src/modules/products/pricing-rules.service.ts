import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DRIZZLE_DB } from '../../common/database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../db/schema';
import { eq } from 'drizzle-orm';
import { CreatePricingRuleDto } from './dto/pricing-rule.dto';
import { calculateForwardPricing, calculateReversePricing, calculateBulkPricing } from '../../lib/pricing-engine.util';

@Injectable()
export class PricingRulesService {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async create(dto: CreatePricingRuleDto) {
    const [rule] = await this.db.insert(schema.pricingRules).values({
      productId: dto.productId,
      type: dto.type as any,
      weightGram: dto.weightGram,
      targetPrice: dto.targetPrice,
      marginPct: dto.marginPct,
      rounding: dto.rounding || 100,
    }).returning();

    return rule;
  }

  async findByProductId(productId: string) {
    const product = await this.db.query.products.findFirst({
      where: eq(schema.products.id, productId),
    });

    if (!product) {
      throw new NotFoundException(`Produk dengan ID ${productId} tidak ditemukan`);
    }

    const rules = await this.db.query.pricingRules.findMany({
      where: eq(schema.pricingRules.productId, productId),
    });

    return rules.map(rule => {
      let calculatedValue: number | null = null;
      let calculatedLabel: string = '';

      if (rule.type === 'WEIGHT' && rule.weightGram) {
        calculatedValue = calculateForwardPricing(
          Number(product.baseCostPerGram),
          rule.weightGram,
          Number(product.packagingCost),
          rule.marginPct,
          rule.rounding
        );
        calculatedLabel = 'calculated_price';
      } else if (rule.type === 'FIXED_PRICE' && rule.targetPrice) {
        calculatedValue = calculateReversePricing(
          rule.targetPrice,
          Number(product.baseCostPerGram),
          Number(product.packagingCost),
          rule.marginPct
        );
        calculatedLabel = 'calculated_weight';
      } else if (rule.type === 'BULK') {
        calculatedValue = calculateBulkPricing(
          Number(product.currentHpp), // Using current HPP for bulk? PRD says rounding base_cost * (1 + margin)
          rule.marginPct,
          rule.rounding
        );
        calculatedLabel = 'calculated_price';
      }

      return {
        ...rule,
        [calculatedLabel]: calculatedValue,
      };
    });
  }

  async remove(id: string) {
    await this.db.delete(schema.pricingRules).where(eq(schema.pricingRules.id, id));
    return { message: 'Berhasil menghapus aturan harga' };
  }
}
