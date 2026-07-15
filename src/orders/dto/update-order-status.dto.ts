import { IsEnum, IsNotEmpty } from 'class-validator';
import { OrderStatus } from '../entities/order.entity';

export class UpdateOrderStatusDto {
  @IsNotEmpty({ message: 'El estado del pedido es obligatorio' })
  @IsEnum(OrderStatus, {
    message:
      'El estado del pedido debe ser uno de: PENDING, CONFIRMED, SHIPPED, DELIVERED, CANCELLED',
  })
  status: OrderStatus;
}
