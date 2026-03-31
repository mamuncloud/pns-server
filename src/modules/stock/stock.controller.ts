import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { StockService } from './stock.service';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Stock')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('stock')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Get('movements')
  @Roles('MANAGER', 'CASHIER')
  @ApiOperation({ summary: 'Get stock movement history (ledger)' })
  @ApiQuery({ name: 'productVariantId', required: false, description: 'Filter by product variant ID' })
  @ApiQuery({ name: 'productId', required: false, description: 'Filter by product ID' })
  @ApiQuery({ name: 'search', required: false, description: 'Search movements by product name' })
  @ApiResponse({ status: 200, description: 'Stock movements retrieved successfully' })
  async findAll(
    @Query('productVariantId') productVariantId?: string,
    @Query('productId') productId?: string,
    @Query('search') search?: string
  ) {
    return this.stockService.findAll({ productVariantId, productId, search });
  }

  @Post('adjust')
  @Roles('MANAGER')
  @ApiOperation({ summary: 'Manually adjust stock (for stock opname or corrections)' })
  @ApiResponse({ status: 201, description: 'Stock adjusted successfully' })
  async adjust(@Body() dto: AdjustStockDto) {
    return this.stockService.adjust(dto);
  }
}
