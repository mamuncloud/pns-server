import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateExpenseCategoryDto {
  @ApiProperty({ example: 'Listrik & Air' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Biaya utilitas bulanan', required: false })
  @IsString()
  @IsOptional()
  description?: string;
}
