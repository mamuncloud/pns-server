import { Controller, Post, Body, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PricingRulesService } from './pricing-rules.service';
import { CreatePricingRuleDto } from './dto/pricing-rule.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Pricing Rules')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('MANAGER')
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
