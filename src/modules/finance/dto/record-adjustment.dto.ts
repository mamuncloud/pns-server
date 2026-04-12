import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RecordAdjustmentDto {
  @ApiProperty({ enum: ['INCOME', 'EXPENSE'] })
  @IsEnum(['INCOME', 'EXPENSE'])
  type: 'INCOME' | 'EXPENSE';

  @ApiProperty({ enum: ['CAPITAL_INJECTION', 'ADJUSTMENT'] })
  @IsEnum(['CAPITAL_INJECTION', 'ADJUSTMENT'])
  category: 'CAPITAL_INJECTION' | 'ADJUSTMENT';

  @ApiProperty({ example: 1000000 })
  @IsInt()
  @IsNotEmpty()
  amount: number;

  @ApiProperty({ example: 'Modal awal toko' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ enum: ['CASH', 'EDC_BCA', 'MAYAR'], required: false, default: 'CASH' })
  @IsEnum(['CASH', 'EDC_BCA', 'MAYAR'])
  @IsOptional()
  paymentMethod?: 'CASH' | 'EDC_BCA' | 'MAYAR';
}
