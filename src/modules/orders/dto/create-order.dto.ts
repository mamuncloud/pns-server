import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum, IsInt, IsOptional, IsUUID, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export enum OrderType {
  PRE_ORDER = 'PRE_ORDER',
  WALK_IN = 'WALK_IN',
}

class CreateOrderItemDto {
  @ApiProperty({ example: 'uuid-variant-123' })
  @IsUUID()
  productVariantId: string;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({ example: 12000 })
  @IsInt()
  @Min(0)
  price: number;

  @ApiProperty({ example: 'uuid-rule-456', required: false })
  @IsOptional()
  @IsUUID()
  pricingRuleId?: string;
}

export class CreateOrderDto {
  @ApiProperty({ example: 'uuid-user-123', required: false })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiProperty({ enum: OrderType })
  @IsEnum(OrderType)
  orderType: OrderType;

  @ApiProperty({ type: [CreateOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];
}
