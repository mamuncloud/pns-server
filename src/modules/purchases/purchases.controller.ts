import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { PurchasesService } from './purchases.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { UpdatePurchaseDto } from './dto/update-purchase.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Purchases')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ANY_EMPLOYEE')
@Controller('purchases')
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Post()
  @ApiOperation({ summary: 'Mencatat transaksi pembelian baru' })
  @ApiResponse({ status: 201, description: 'Pembelian berhasil dicatat.' })
  create(@Body() createPurchaseDto: CreatePurchaseDto) {
    return this.purchasesService.create(createPurchaseDto);
  }

  @Get()
  @ApiOperation({ summary: 'Mendapatkan semua riwayat pembelian' })
  findAll() {
    return this.purchasesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Mendapatkan detail pembelian berdasarkan ID' })
  findOne(@Param('id') id: string) {
    return this.purchasesService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Memperbarui transaksi pembelian' })
  @ApiResponse({ status: 200, description: 'Pembelian berhasil diperbarui.' })
  update(@Param('id') id: string, @Body() updatePurchaseDto: UpdatePurchaseDto) {
    return this.purchasesService.update(id, updatePurchaseDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Menghapus transaksi pembelian (hanya status DRAFT)' })
  @ApiResponse({ status: 200, description: 'Pembelian berhasil dihapus.' })
  remove(@Param('id') id: string) {
    return this.purchasesService.remove(id);
  }
}
