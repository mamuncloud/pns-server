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
  ValidateNested 
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

  @ApiProperty({ example: 80, description: 'Base cost per gram' })
  @IsInt()
  @Min(0)
  baseCostPerGram: number;

  @ApiProperty({ example: 500, description: 'Packaging cost' })
  @IsInt()
  @Min(0)
  packagingCost: number;

  @ApiPropertyOptional({ example: ['MANIS', 'PEDAS'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  taste?: string[];

  @ApiProperty({ type: [CreateVariantDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVariantDto)
  variants: CreateVariantDto[];

  @ApiPropertyOptional({ type: [CreateProductImageDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductImageDto)
  images?: CreateProductImageDto[];

  @ApiPropertyOptional({ type: [CreateProductPricingRuleDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductPricingRuleDto)
  pricingRules?: CreateProductPricingRuleDto[];
}
