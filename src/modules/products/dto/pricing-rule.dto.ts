import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';

export enum PricingType {
  WEIGHT = 'WEIGHT',
  FIXED_PRICE = 'FIXED_PRICE',
  BULK = 'BULK',
}

export class CreatePricingRuleDto {
  @ApiProperty({ example: 'uuid-123' })
  @IsUUID()
  productId: string;

  @ApiProperty({ enum: PricingType })
  @IsEnum(PricingType)
  type: PricingType;

  @ApiProperty({ required: false, example: 500 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  weightGram?: number;

  @ApiProperty({ required: false, example: 10000 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  targetPrice?: number;

  @ApiProperty({ example: 20 })
  @IsNumber()
  @Min(0)
  marginPct: number;

  @ApiProperty({ required: false, example: 1000 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  rounding?: number;
}
