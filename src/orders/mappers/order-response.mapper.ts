import { OrderResponseDto } from '../dto/order-response.dto';
import { Order } from '../entities/order.entity';

export function mapOrderResponse(order: Order): OrderResponseDto {
  return {
    id: order.id,
    customerId: order.customerId,
    customer: order.customer,
    orderDate: order.orderDate,
    status: order.status,
    total: order.total,
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal: item.unitPrice * item.quantity,
      product: item.product,
    })),
  };
}
