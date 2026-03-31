import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

class SettleConsignmentItemDto {
  @ApiProperty({ description: 'ID Item Konsinyasi' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ description: 'Jumlah Barang Sisa Aktual (Stok Aktual)' })
  @IsInt()
  @Min(0)
  currentStock: number;

  @ApiProperty({ description: 'Jumlah Barang Dikembalikan (Retur)' })
  @IsInt()
  @IsOptional()
  @Min(0)
  qtyReturned?: number;
}

export class SettleConsignmentDto {
  @ApiProperty({ description: 'ID Nota Konsinyasi' })
  @IsString()
  @IsNotEmpty()
  consignmentId: string;

  @ApiProperty({ description: 'Daftar Penyelesaian Item', type: [SettleConsignmentItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SettleConsignmentItemDto)
  items: SettleConsignmentItemDto[];

  @ApiProperty({ description: 'Catatan penyelesaian', required: false })
  @IsString()
  @IsOptional()
  note?: string;
}
