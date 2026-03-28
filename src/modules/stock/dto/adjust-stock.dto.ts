import { IsString, IsInt, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AdjustStockDto {
  @ApiProperty({ description: 'Product variant ID to adjust', example: 'uuid...' })
  @IsString()
  @IsNotEmpty()
  productVariantId: string;

  @ApiProperty({
    description: 'Delta to apply. Positive to add stock, negative to deduct.',
    example: -5,
  })
  @IsInt()
  quantity: number;

  @ApiPropertyOptional({ description: 'Reason for the adjustment', example: 'Stok rusak saat pengiriman' })
  @IsOptional()
  @IsString()
  note?: string;
}
