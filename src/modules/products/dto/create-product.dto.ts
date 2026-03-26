import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { 
  IsArray, 
  IsBoolean, 
  IsEnum, 
  IsInt, 
  IsNotEmpty, 
  IsOptional, 
  IsString, 
  Min, 
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize
} from 'class-validator';

export class CreateVariantDto {
  @ApiProperty({ example: '250g' })
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiProperty({ example: 25000 })
  @IsInt()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @IsInt()
  @Min(0)
  initialStock?: number;

  @ApiPropertyOptional({ example: 'PNS-000001' })
  @IsOptional()
  @IsString()
  sku?: string;
}

export class CreateProductImageDto {
  @ApiProperty({ example: 'products/sample.png' })
  @IsString()
  @IsNotEmpty()
  url: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export enum PricingType {
  WEIGHT = 'WEIGHT',
  FIXED_PRICE = 'FIXED_PRICE',
  BULK = 'BULK',
}

export enum ProductTaste {
  GURIH = 'GURIH',
  PEDAS = 'PEDAS',
  MANIS = 'MANIS',
}

export class CreateProductPricingRuleDto {
  @ApiProperty({ enum: PricingType })
  @IsEnum(PricingType)
  type: PricingType;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  weightGram?: number;

  @ApiPropertyOptional({ example: 10000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  targetPrice?: number;

  @ApiProperty({ example: 20 })
  @IsInt()
  @Min(0)
  marginPct: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  rounding?: number;
}

export class CreateProductDto {
  @ApiProperty({ example: 'Product Name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'brand-uuid' })
  @IsOptional()
  @IsString()
  brandId?: string;

  @ApiProperty({ enum: ProductTaste, isArray: true, example: [ProductTaste.MANIS, ProductTaste.PEDAS], description: 'Min 1, max 3 flavors' })
  @IsArray()
  @IsEnum(ProductTaste, { each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  taste: ProductTaste[];

  @ApiPropertyOptional({ type: [CreateProductImageDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductImageDto)
  images?: CreateProductImageDto[];

  @ApiPropertyOptional({ type: [CreateVariantDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVariantDto)
  variants?: CreateVariantDto[];
}
