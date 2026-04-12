import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProductVariantLabel } from '../../products/dto/create-product.dto';

class PurchaseItemDto {
  @ApiProperty({ example: 'uuid-123' })
  @IsUUID()
  productId: string;

  @ApiProperty({ enum: ProductVariantLabel, example: ProductVariantLabel.Medium })
  @IsEnum(ProductVariantLabel)
  @IsOptional()
  package?: ProductVariantLabel;

  @ApiProperty({ example: 10 })
  @IsInt()
  @Min(1)
  qty: number;

  @ApiProperty({ example: 50000 })
  @IsNumber()
  @Min(0)
  totalCost: number;

  @ApiProperty({ example: 5000 })
  @IsNumber()
  @Min(0)
  extraCosts: number;

  @ApiProperty({ example: 10000 })
  @IsNumber()
  @Min(0)
  sellingPrice: number;

  @ApiProperty({ example: 250, description: 'Size of this variant in grams' })
  @IsInt()
  @Min(1)
  @IsOptional()
  sizeInGram?: number;

  @ApiProperty({ example: '2027-12-31' })
  @IsDateString()
  @IsOptional()
  expiredDate?: string;
}

export class CreatePurchaseDto {
  @ApiProperty({ example: 'uuid-supp-123' })
  @IsUUID()
  supplierId: string;

  @ApiProperty({ example: '2026-03-26T00:00:00.000Z' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: 'Restock inventory' })
  @IsString()
  @IsOptional()
  note?: string;

  @ApiProperty({ type: [PurchaseItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseItemDto)
  items: PurchaseItemDto[];

  @ApiProperty({ enum: ['DRAFT', 'COMPLETED'], example: 'DRAFT' })
  @IsEnum(['DRAFT', 'COMPLETED'])
  @IsOptional()
  status?: 'DRAFT' | 'COMPLETED';
}
