import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min, IsString } from 'class-validator';

export class CustomerQueryDto {
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
    description: 'Search by name or phone',
    required: false,
    example: '0812',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Sort by field',
    required: false,
    example: 'totalOrders',
    enum: ['name', 'phone', 'totalOrders', 'totalSpent', 'lastOrderDate', 'createdAt'],
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

export class CustomerMetaDto {
  @ApiProperty({ example: 1, description: 'Current page number' })
  page: number;

  @ApiProperty({ example: 10, description: 'Items per page' })
  limit: number;

  @ApiProperty({ example: 50, description: 'Total number of items' })
  totalItems: number;

  @ApiProperty({ example: 5, description: 'Total number of pages' })
  totalPages: number;
}

export class CustomerResponseDto {
  @ApiProperty({ description: 'Customer ID' })
  id: string;

  @ApiProperty({ description: 'Customer name' })
  name: string | null;

  @ApiProperty({ description: 'Customer phone' })
  phone: string | null;

  @ApiProperty({ description: 'Email if registered' })
  email: string | null;

  @ApiProperty({ description: 'Total number of orders' })
  totalOrders: number;

  @ApiProperty({ description: 'Total amount spent in cents' })
  totalSpent: number;

  @ApiProperty({ description: 'Date of last order' })
  lastOrderDate: string | null;

  @ApiProperty({ description: 'Account creation date' })
  createdAt: string;
}

export class CustomerListResponseDto {
  @ApiProperty({ description: 'Response message' })
  message: string;

  @ApiProperty({ type: [CustomerResponseDto] })
  data: CustomerResponseDto[];

  @ApiProperty({ type: CustomerMetaDto })
  meta: CustomerMetaDto;
}