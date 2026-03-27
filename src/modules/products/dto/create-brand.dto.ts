import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateBrandDto {
  @ApiProperty({ example: 'Brand Name' })
  @IsString()
  @IsNotEmpty()
  name: string;
}
