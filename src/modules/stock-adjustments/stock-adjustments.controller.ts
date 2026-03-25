import { Controller, Post, Body, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { StockAdjustmentsService } from './stock-adjustments.service';
import { CreateStockAdjustmentDto } from './dto/create-stock-adjustment.dto';

@ApiTags('Stock Adjustments')
@Controller('stock-adjustments')
export class StockAdjustmentsController {
  constructor(private readonly stockAdjustmentsService: StockAdjustmentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new stock adjustment' })
  @ApiResponse({ status: 201, description: 'Stock adjustment created successfully' })
  async create(@Body() createStockAdjustmentDto: CreateStockAdjustmentDto) {
    return this.stockAdjustmentsService.create(createStockAdjustmentDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all stock adjustments' })
  @ApiResponse({ status: 200, description: 'Stock adjustments retrieved successfully' })
  async findAll() {
    return this.stockAdjustmentsService.findAll();
  }
}
