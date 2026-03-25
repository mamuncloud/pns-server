import { Controller, Post, Body, Param, Delete } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PricingRulesService } from './pricing-rules.service';
import { CreatePricingRuleDto } from './dto/pricing-rule.dto';

@ApiTags('Pricing Rules')
@Controller('pricing-rules')
export class PricingRulesController {
  constructor(private readonly pricingRulesService: PricingRulesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new pricing rule' })
  @ApiResponse({ status: 201, description: 'Pricing rule created successfully' })
  async create(@Body() createPricingRuleDto: CreatePricingRuleDto) {
    return this.pricingRulesService.create(createPricingRuleDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a pricing rule' })
  @ApiResponse({ status: 200, description: 'Pricing rule deleted successfully' })
  async remove(@Param('id') id: string) {
    return this.pricingRulesService.remove(id);
  }
}
