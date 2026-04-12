import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class CreateRepackItemDto {
  @IsString()
  @IsNotEmpty()
  targetVariantPackage: string; // e.g. "250gr", "500gr"

  @IsInt()
  @IsNotEmpty()
  qtyProduced: number;

  @IsInt()
  @IsNotEmpty()
  sellingPrice: number;

  @IsInt()
  @IsOptional()
  sizeInGram?: number;
}

export class CreateRepackDto {
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @IsUUID()
  @IsNotEmpty()
  sourceVariantId: string;

  @IsInt()
  @IsNotEmpty()
  sourceQtyUsed: number;

  @IsString()
  @IsOptional()
  note?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRepackItemDto)
  items: CreateRepackItemDto[];
}
