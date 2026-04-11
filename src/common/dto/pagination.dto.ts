import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min, IsString } from 'class-validator';

export class PaginationQueryDto {
  @ApiProperty({
    description: 'Page number (1-indexed)',
    required: false,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Number of items per page',
    required: false,
    default: 10,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiProperty({
    description: 'Filter by taste',
    required: false,
    example: 'Pedas',
  })
  @IsOptional()
  taste?: string;

  @ApiProperty({
    description: 'Search by name',
    required: false,
    example: 'ro',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Filter products that have stock > 0',
    required: false,
    example: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  hasStock?: boolean;

  @ApiProperty({
    description: 'Sort by field',
    required: false,
    example: 'stock',
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiProperty({
    description: 'Sort order',
    required: false,
    example: 'desc',
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}

class PaginationMetaDto {
  @ApiProperty({ example: 1, description: 'Current page number' })
  page: number;

  @ApiProperty({ example: 10, description: 'Items per page' })
  limit: number;

  @ApiProperty({ example: 50, description: 'Total number of items' })
  totalItems: number;

  @ApiProperty({ example: 5, description: 'Total number of pages' })
  totalPages: number;
}

export class PaginatedResponseDto<T> {
  @ApiProperty({ description: 'Response message' })
  message: string;

  data: T[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
