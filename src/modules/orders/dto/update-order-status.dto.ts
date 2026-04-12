import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export enum UpdateableOrderStatus {
  READY = 'READY',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export class UpdateOrderStatusDto {
  @ApiProperty({
    enum: UpdateableOrderStatus,
    description: 'New order status. Allowed transitions: PAID→READY, READY→COMPLETED, any→CANCELLED',
  })
  @IsEnum(UpdateableOrderStatus)
  status: UpdateableOrderStatus;
}
