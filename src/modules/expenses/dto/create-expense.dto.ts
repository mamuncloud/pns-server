import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsInt, IsOptional, IsDateString } from 'class-validator';

export class CreateExpenseDto {
  @ApiProperty({ example: 'expense-cat-1' })
  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @ApiProperty({ example: 500000 })
  @IsInt()
  @IsNotEmpty()
  amount: number;

  @ApiProperty({ example: 'Bayar listrik bulan April' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: '2026-04-03T00:00:00Z', required: false })
  @IsDateString()
  @IsOptional()
  date?: string;

  @ApiProperty({ example: 'https://storage.example.com/receipt.jpg', required: false })
  @IsString()
  @IsOptional()
  receiptUrl?: string;

  @ApiProperty({ example: 'emp-1', required: false })
  @IsString()
  @IsOptional()
  employeeId?: string;
}
