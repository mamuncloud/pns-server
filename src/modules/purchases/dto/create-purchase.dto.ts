import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNumber, IsUUID, Min } from 'class-validator';

export class CreatePurchaseDto {
  @ApiProperty({ example: 'uuid-123' })
  @IsUUID()
  productId: string;

  @ApiProperty({ example: 100 })
  @IsInt()
  @Min(1)
  qty: number;

  @ApiProperty({ example: 5000 })
  @IsNumber()
  @Min(0)
  costPerUnit: number;
}
