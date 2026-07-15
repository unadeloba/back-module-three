import { IsEnum, IsNotEmpty } from 'class-validator';
import { OrderStatus } from '../entities/order.entity';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: OrderStatus, enumName: 'OrderStatus' })
  @IsNotEmpty({ message: 'El estado del pedido es obligatorio' })
  @IsEnum(OrderStatus, {
    message:
      'El estado del pedido debe ser uno de: PENDING, CONFIRMED, SHIPPED, DELIVERED, CANCELLED',
  })
  status: OrderStatus;
}
