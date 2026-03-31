import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ConsignmentService } from './consignment.service';
import { CreateConsignmentDto } from './dto/create-consignment.dto';
import { SettleConsignmentDto } from './dto/settle-consignment.dto';

@ApiTags('Consignment')
@Controller('consignment')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ConsignmentController {
  constructor(private readonly consignmentService: ConsignmentService) {}

  @Post()
  @Roles('MANAGER', 'CASHIER')
  @ApiOperation({ summary: 'Menerima barang titipan baru (Konsinyasi)' })
  @ApiResponse({ status: 201, description: 'Nota konsinyasi berhasil dibuat' })
  async create(@Body() createConsignmentDto: CreateConsignmentDto) {
    return await this.consignmentService.create(createConsignmentDto);
  }

  @Get()
  @Roles('MANAGER', 'CASHIER')
  @ApiOperation({ summary: 'Dapatkan semua daftar nota konsinyasi' })
  @ApiQuery({ name: 'search', required: false, description: 'Search consignments by supplier name' })
  @ApiResponse({ status: 200, description: 'Daftar nota berhasil ditemukan' })
  async findAll(@Query('search') search?: string) {
    return await this.consignmentService.findAll(search);
  }

  @Get(':id')
  @Roles('MANAGER', 'CASHIER')
  @ApiOperation({ summary: 'Dapatkan detail nota konsinyasi berdasarkan ID' })
  @ApiResponse({ status: 200, description: 'Detail nota berhasil ditemukan' })
  async findOne(@Param('id') id: string) {
    return await this.consignmentService.findOne(id);
  }

  @Post('settle')
  @Roles('MANAGER', 'CASHIER')
  @ApiOperation({ summary: 'Proses penyelesaian pembayaran (Settlement) barang laku' })
  @ApiResponse({ status: 200, description: 'Penyelesaian berhasil dicatat' })
  async settle(@Body() settleConsignmentDto: SettleConsignmentDto) {
    return await this.consignmentService.settle(settleConsignmentDto);
  }
}
