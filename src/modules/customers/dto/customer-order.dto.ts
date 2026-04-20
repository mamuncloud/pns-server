import { ApiProperty } from '@nestjs/swagger';

export class CustomerOrderItemDto {
  @ApiProperty({ description: 'Product name' })
  productName: string;

  @ApiProperty({ description: 'Variant/package' })
  package: string;

  @ApiProperty({ description: 'Quantity' })
  quantity: number;

  @ApiProperty({ description: 'Unit price in cents' })
  unitPrice: number;

  @ApiProperty({ description: 'Subtotal in cents' })
  subtotal: number;
}

export class CustomerOrderDto {
  @ApiProperty({ description: 'Order ID' })
  id: string;

  @ApiProperty({ description: 'Order type' })
  orderType: string;

  @ApiProperty({ description: 'Order status' })
  status: string;

  @ApiProperty({ description: 'Total amount in cents' })
  totalAmount: number;

  @ApiProperty({ description: 'Payment method' })
  paymentMethod: string;

  @ApiProperty({ description: 'Order date' })
  createdAt: Date;

  @ApiProperty({ type: [CustomerOrderItemDto] })
  items: CustomerOrderItemDto[];
}

export class CustomerDetailResponseDto {
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

  @ApiProperty({ type: [CustomerOrderDto] })
  orders: CustomerOrderDto[];
}