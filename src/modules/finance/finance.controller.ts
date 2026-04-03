import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RecordAdjustmentDto } from './dto/record-adjustment.dto';

@ApiTags('Finance')
@Controller('finance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('summary')
  @Roles('MANAGER')
  @ApiOperation({ summary: 'Get financial summary (P&L)' })
  @ApiResponse({ status: 200, description: 'Return financial summary' })
  async getSummary() {
    return await this.financeService.getSummary();
  }

  @Get('ledger')
  @Roles('MANAGER')
  @ApiOperation({ summary: 'Get detailed financial ledger' })
  @ApiResponse({ status: 200, description: 'Return ledger entries' })
  async getLedger(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('category') category?: string,
    @Query('type') type?: string,
  ) {
    return await this.financeService.getLedger({ startDate, endDate, category, type });
  }

  @Post('adjustment')
  @Roles('MANAGER')
  @ApiOperation({ summary: 'Record a financial adjustment (e.g. Initial Capital)' })
  @ApiResponse({ status: 201, description: 'Adjustment recorded' })
  async recordAdjustment(
    @Body() dto: RecordAdjustmentDto
  ) {
    return await this.financeService.recordTransaction({
      ...dto,
      date: new Date(),
    });
  }
}
