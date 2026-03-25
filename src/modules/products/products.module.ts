import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { PricingRulesService } from './pricing-rules.service';
import { PricingRulesController } from './pricing-rules.controller';

@Module({
  controllers: [ProductsController, PricingRulesController],
  providers: [ProductsService, PricingRulesService],
  exports: [ProductsService, PricingRulesService],
})
export class ProductsModule {}
