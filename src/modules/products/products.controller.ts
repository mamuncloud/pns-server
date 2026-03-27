import { Controller, Get, Param, NotFoundException, Query, Post, Body } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateBrandDto } from './dto/create-brand.dto';
import { ApiOperation, ApiResponse, ApiTags, ApiParam } from '@nestjs/swagger';
import { AllProductsResponseDto, SingleProductResponseDto } from './dto/product-response.dto';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { PricingRulesService } from './pricing-rules.service';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly pricingRulesService: PricingRulesService,
  ) {}

  @Get('brands')
  @ApiOperation({ summary: 'Get all brands' })
  @ApiResponse({ status: 200, description: 'Brands retrieved successfully' })
  async findBrands() {
    const brands = await this.productsService.findBrands();
    return {
      message: 'Berhasil mengambil semua brand',
      data: brands,
    };
  }

  @Post('brands')
  @ApiOperation({ summary: 'Create new brand' })
  @ApiResponse({ status: 201, description: 'Brand created successfully' })
  async createBrand(@Body() dto: CreateBrandDto) {
    const brand = await this.productsService.createBrand(dto);
    return {
      message: 'Berhasil membuat brand baru',
      data: brand,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all products', description: 'Returns a paginated list of all products along with their variants.' })
  @ApiResponse({ status: 200, description: 'Products retrieved successfully', type: AllProductsResponseDto })
  async findAll(@Query() query: PaginationQueryDto) {
    const { page, limit, taste } = query;
    const { data, totalItems } = await this.productsService.findAll(page, limit, taste);
    
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

  @Get(':id/pricing')
  @ApiOperation({ summary: 'Get pricing rules for a product' })
  @ApiParam({ name: 'id', description: 'Unique identifier of the product' })
  @ApiResponse({ status: 200, description: 'Pricing rules retrieved successfully' })
  async getPricing(@Param('id') id: string) {
    const result = await this.pricingRulesService.findByProductId(id);
    return {
      message: 'Berhasil mengambil aturan harga produk',
      data: result,
    };
  }

  @Post()
  @ApiOperation({ summary: 'Create new product', description: 'Creates a new product with its variants, images, and pricing rules.' })
  @ApiResponse({ status: 201, description: 'Product created successfully' })
  async create(@Body() dto: CreateProductDto) {
    const result = await this.productsService.create(dto);
    return {
      message: 'Berhasil membuat produk baru',
      data: result,
    };
  }
}
