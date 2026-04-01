import { Controller, Get, Param, NotFoundException, Query, Post, Body, Patch, UseGuards } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto, CreateVariantDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateBrandDto } from './dto/create-brand.dto';
import { ApiOperation, ApiResponse, ApiTags, ApiParam, ApiBearerAuth, ApiQuery, ApiBody } from '@nestjs/swagger';
import { AllProductsResponseDto, SingleProductResponseDto } from './dto/product-response.dto';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { PricingRulesService } from './pricing-rules.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly pricingRulesService: PricingRulesService,
  ) {}

  @Get('brands')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ANY_EMPLOYEE')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all brands' })
  @ApiQuery({ name: 'search', required: false, description: 'Search brands by name' })
  @ApiResponse({ status: 200, description: 'Brands retrieved successfully' })
  async findBrands(@Query('search') search?: string) {
    const brands = await this.productsService.findBrands(search);
    return {
      message: 'Berhasil mengambil semua brand',
      data: brands,
    };
  }

  @Post('brands')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MANAGER')
  @ApiBearerAuth()
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
  @ApiQuery({ name: 'search', required: false, description: 'Search products by name' })
  @ApiResponse({ status: 200, description: 'Products retrieved successfully', type: AllProductsResponseDto })
  async findAll(@Query() query: PaginationQueryDto) {
    const { page, limit, taste, search, hasStock } = query;
    const { data, totalItems } = await this.productsService.findAll(page, limit, taste, search, hasStock);
    
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ANY_EMPLOYEE')
  @ApiBearerAuth()
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MANAGER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new product', description: 'Creates a new product with its variants, images, and pricing rules.' })
  @ApiResponse({ status: 201, description: 'Product created successfully' })
  async create(@Body() dto: CreateProductDto) {
    const result = await this.productsService.create(dto);
    return {
      message: 'Berhasil membuat produk baru',
      data: result,
    };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MANAGER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update product', description: 'Updates an existing product\'s basic fields.' })
  @ApiParam({ name: 'id', description: 'Unique identifier of the product' })
  @ApiResponse({ status: 200, description: 'Product updated successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    const result = await this.productsService.update(id, dto);
    return {
      message: 'Berhasil memperbarui produk',
      data: result,
    };
  }

  @Post(':id/variants')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MANAGER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new variant', description: 'Adds a new variant to an existing product.' })
  @ApiParam({ name: 'id', description: 'Unique identifier of the product' })
  @ApiBody({ type: CreateVariantDto })
  @ApiResponse({ status: 201, description: 'Variant created successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async createVariant(@Param('id') id: string, @Body() dto: CreateVariantDto) {
    const variant = await this.productsService.createVariant(id, dto);
    return {
      message: 'Berhasil menambahkan varian baru',
      data: variant,
    };
  }
}
