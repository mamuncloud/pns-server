import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  IsEnum,
} from 'class-validator';

export enum ProductVariantLabel {
  Medium = 'Medium',
  Small = 'Small',
  '250GR' = '250gr',
  '500GR' = '500gr',
  '1KG' = '1kg',
  BAL = 'bal',
}

export class CreateVariantDto {
  @ApiProperty({ enum: ProductVariantLabel, example: ProductVariantLabel['250GR'] })
  @IsEnum(ProductVariantLabel)
  @IsNotEmpty()
  package: ProductVariantLabel;

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

  @ApiPropertyOptional({ example: 250, description: 'Size of this variant in grams' })
  @IsOptional()
  @IsInt()
  @Min(1)
  sizeInGram?: number;
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

export enum ProductTaste {
  GURIH = 'GURIH',
  PEDAS = 'PEDAS',
  MANIS = 'MANIS',
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

  @ApiProperty({
    enum: ProductTaste,
    isArray: true,
    example: [ProductTaste.MANIS, ProductTaste.PEDAS],
    description: 'Min 1, max 3 flavors',
  })
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
