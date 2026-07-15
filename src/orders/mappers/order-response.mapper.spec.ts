import { OrderStatus } from '../entities/order.entity';
import { mapOrderResponse } from './order-response.mapper';

describe('mapOrderResponse', () => {
  it('maps priced order lines to canonical numeric response fields', () => {
    const response = mapOrderResponse({
      id: 'order-1',
      customerId: 'customer-1',
      customer: { id: 'customer-1', fullName: 'Ada Lovelace' },
      orderDate: new Date('2026-07-15T00:00:00.000Z'),
      status: OrderStatus.PENDING,
      total: 30,
      items: [
        {
          id: 'line-1',
          productId: 'product-1',
          quantity: 2,
          unitPrice: 12.5,
          product: { id: 'product-1', name: 'Keyboard' },
        },
        {
          id: 'line-2',
          productId: 'product-2',
          quantity: 1,
          unitPrice: 5,
          product: { id: 'product-2', name: 'Cable' },
        },
      ],
    });

    expect(response).toEqual({
      id: 'order-1',
      customerId: 'customer-1',
      customer: { id: 'customer-1', fullName: 'Ada Lovelace' },
      orderDate: new Date('2026-07-15T00:00:00.000Z'),
      status: OrderStatus.PENDING,
      total: 30,
      items: [
        {
          id: 'line-1',
          productId: 'product-1',
          quantity: 2,
          unitPrice: 12.5,
          subtotal: 25,
          product: { id: 'product-1', name: 'Keyboard' },
        },
        {
          id: 'line-2',
          productId: 'product-2',
          quantity: 1,
          unitPrice: 5,
          subtotal: 5,
          product: { id: 'product-2', name: 'Cable' },
        },
      ],
    });
  });

  it('preserves SHIPPED as a public status with numeric money values', () => {
    const response = mapOrderResponse({
      id: 'order-2',
      customerId: 'customer-2',
      customer: { id: 'customer-2' },
      orderDate: new Date('2026-07-15T01:00:00.000Z'),
      status: OrderStatus.SHIPPED,
      total: 7.5,
      items: [
        {
          id: 'line-3',
          productId: 'product-3',
          quantity: 3,
          unitPrice: 2.5,
          product: { id: 'product-3' },
        },
      ],
    });

    expect(response.status).toBe(OrderStatus.SHIPPED);
    expect(response.total).toBe(7.5);
    expect(response.items[0]).toEqual({
      id: 'line-3',
      productId: 'product-3',
      quantity: 3,
      unitPrice: 2.5,
      subtotal: 7.5,
      product: { id: 'product-3' },
    });
  });
});
