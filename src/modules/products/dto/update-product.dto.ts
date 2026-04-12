import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ProductTaste } from './create-product.dto';

export class UpdateProductImageDto {
  @ApiPropertyOptional({ example: 'uuid-123' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiPropertyOptional({ example: 'products/sample.png' })
  @IsString()
  @IsNotEmpty()
  url: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  isPrimary: boolean;
}

export class UpdateProductDto {
  @ApiPropertyOptional({ example: 'Product Name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'brand-uuid' })
  @IsOptional()
  @IsString()
  brandId?: string;

  @ApiPropertyOptional({ enum: ProductTaste, isArray: true, example: [ProductTaste.GURIH] })
  @IsOptional()
  @IsArray()
  @IsEnum(ProductTaste, { each: true })
  taste?: ProductTaste[];

  @ApiPropertyOptional({ type: [UpdateProductImageDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateProductImageDto)
  images?: UpdateProductImageDto[];

  @ApiPropertyOptional({ type: [String], example: ['img-uuid-1', 'img-uuid-2'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  removeImageIds?: string[];
}
