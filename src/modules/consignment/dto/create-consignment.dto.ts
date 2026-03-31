import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

class CreateConsignmentItemDto {
  @ApiProperty({ description: 'ID Varian Produk' })
  @IsString()
  @IsNotEmpty()
  productVariantId: string;

  @ApiProperty({ description: 'Jumlah Barang Diterima' })
  @IsInt()
  @Min(1)
  qtyReceived: number;

  @ApiProperty({ description: 'Harga Pokok Satuan (Cents)' })
  @IsInt()
  @Min(0)
  unitCost: number;
}

export class CreateConsignmentDto {
  @ApiProperty({ description: 'ID Supplier' })
  @IsString()
  @IsNotEmpty()
  supplierId: string;

  @ApiProperty({ description: 'Tanggal Nota' })
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({ description: 'Catatan tambahan', required: false })
  @IsString()
  @IsOptional()
  note?: string;
  
  @ApiProperty({ description: 'URL Attachment Nota', required: false })
  @IsString()
  @IsOptional()
  attachmentUrl?: string;

  @ApiProperty({ description: 'Daftar Barang', type: [CreateConsignmentItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateConsignmentItemDto)
  items: CreateConsignmentItemDto[];
}
