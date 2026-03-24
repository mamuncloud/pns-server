import { Controller, Get, Param, NotFoundException, Query } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ApiOperation, ApiResponse, ApiTags, ApiParam } from '@nestjs/swagger';
import { AllProductsResponseDto, SingleProductResponseDto } from './dto/product-response.dto';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all products', description: 'Returns a paginated list of all products along with their variants.' })
  @ApiResponse({ status: 200, description: 'Products retrieved successfully', type: AllProductsResponseDto })
  async findAll(@Query() query: PaginationQueryDto) {
    const { page, limit } = query;
    const { data, totalItems } = await this.productsService.findAll(page, limit);
    
    return {
      message: 'Berhasil mengambil semua produk',
      data,
      meta: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
      },
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID', description: 'Returns detailed information for a single product and its variants.' })
  @ApiParam({ name: 'id', description: 'Unique identifier of the product', example: 'uuid-456' })
  @ApiResponse({ status: 200, description: 'Product detail retrieved successfully', type: SingleProductResponseDto })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async findOne(@Param('id') id: string) {
    const product = await this.productsService.findOne(id);
    if (!product) {
      throw new NotFoundException(`Produk dengan ID ${id} tidak ditemukan`);
    }
    return {
      message: 'Berhasil mengambil detail produk',
      data: product,
    };
  }
}
