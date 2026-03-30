import { Controller, Get, Param, NotFoundException, UseGuards } from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Suppliers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('MANAGER')
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all suppliers' })
  @ApiResponse({ status: 200, description: 'Suppliers retrieved successfully' })
  async findAll() {
    return this.suppliersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get supplier by ID' })
  @ApiParam({ name: 'id', description: 'Unique identifier of the supplier' })
  @ApiResponse({ status: 200, description: 'Supplier detail retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Supplier not found' })
  async findOne(@Param('id') id: string) {
    const supplier = await this.suppliersService.findOne(id);
    if (!supplier) {
      throw new NotFoundException(`Supplier dengan ID ${id} tidak ditemukan`);
    }
    return {
      message: 'Berhasil mengambil detail supplier',
      data: supplier,
    };
  }
}
