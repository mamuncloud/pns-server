import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsUUID } from 'class-validator';

export enum AdjustmentReason {
  DEFECT = 'DEFECT',
  EXPIRED = 'EXPIRED',
  LOST = 'LOST',
  RESTOCK = 'RESTOCK',
}

export class CreateStockAdjustmentDto {
  @ApiProperty({ example: 'uuid-123' })
  @IsUUID()
  productId: string;

  @ApiProperty({ example: -5 })
  @IsInt()
  qty: number;

  @ApiProperty({ enum: AdjustmentReason })
  @IsEnum(AdjustmentReason)
  reason: AdjustmentReason;
}
