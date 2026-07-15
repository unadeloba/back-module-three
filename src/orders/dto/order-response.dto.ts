import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus } from '../entities/order.entity';

export class OrderItemResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  productId: string;

  @ApiProperty({ minimum: 1 })
  quantity: number;

  @ApiProperty({ type: 'number', format: 'double' })
  unitPrice: number;

  @ApiProperty({ type: 'number', format: 'double' })
  subtotal: number;

  @ApiProperty({ type: 'object', additionalProperties: true })
  product: object;
}

export class OrderResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  customerId: string;

  @ApiProperty({ type: 'object', additionalProperties: true })
  customer: object;

  @ApiProperty({ format: 'date-time' })
  orderDate: Date;

  @ApiProperty({ enum: OrderStatus, enumName: 'OrderStatus' })
  status: OrderStatus;

  @ApiProperty({ type: 'number', format: 'double' })
  total: number;

  @ApiProperty({ type: () => OrderItemResponseDto, isArray: true })
  items: OrderItemResponseDto[];
}
