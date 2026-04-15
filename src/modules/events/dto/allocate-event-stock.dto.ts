import { IsArray, IsInt, IsNotEmpty, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class AllocationItemDto {
  @IsString()
  @IsNotEmpty()
  productVariantId: string;

  @IsInt()
  @Min(1)
  quantity: number;
}

export class AllocateEventStockDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AllocationItemDto)
  items: AllocationItemDto[];
}
