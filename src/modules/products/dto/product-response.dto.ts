import { ApiProperty } from '@nestjs/swagger';
import { PaginatedResponseDto } from '../../../common/dto/pagination.dto';

class ProductVariantDto {
  @ApiProperty({ example: 'uuid-123', description: 'Unique identifier for the product variant' })
  id: string;

  @ApiProperty({ example: 'Medium', description: 'Package size for the variant' })
  package: string;

  @ApiProperty({ example: 15000, description: 'Price of the variant in IDR' })
  price: number;

  @ApiProperty({ example: 100, description: 'Available stock' })
  stock: number;

  @ApiProperty({
    example: 'PNS-ORG-001',
    description: 'Stock Keeping Unit identifier',
    required: false,
  })
  sku?: string;

  @ApiProperty({ example: 250, description: 'Size of the variant in grams', required: false })
  sizeInGram?: number;
}

class ProductDto {
  @ApiProperty({ example: 'uuid-456', description: 'Unique identifier for the product' })
  id: string;

  @ApiProperty({ example: 'PNS Coffee', description: 'Name of the product' })
  name: string;

  @ApiProperty({
    example: 'Authentic Indonesian Coffee',
    description: 'Detailed description of the product',
    required: false,
  })
  description?: string;

  @ApiProperty({
    example: 'https://example.com/image.jpg',
    description: 'URL to product image',
    required: false,
  })
  imageUrl?: string;

  @ApiProperty({ example: ['Strong', 'Nutty'], description: 'Array of taste notes' })
  taste: string[];

  @ApiProperty({ example: true, description: 'Whether the product is currently active' })
  isActive: boolean;

  @ApiProperty({
    type: [ProductVariantDto],
    description: 'List of available variants for this product',
  })
  variants: ProductVariantDto[];
}

export class AllProductsResponseDto extends PaginatedResponseDto<ProductDto> {
  @ApiProperty({ type: [ProductDto] })
  data: ProductDto[];
}

export class SingleProductResponseDto {
  @ApiProperty({ example: 'Berhasil mengambil detail produk' })
  message: string;

  @ApiProperty({ type: ProductDto })
  data: ProductDto;
}
