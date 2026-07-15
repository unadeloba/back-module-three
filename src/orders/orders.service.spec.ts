import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Customer } from '../customers/entities/customer.entity';
import { Product } from '../products/entities/product.entity';
import { Order } from './entities/order.entity';
import { OrdersService } from './orders.service';

describe('OrdersService.create', () => {
  const customer = { id: 'customer-1', isActive: true } as Customer;
  let products: Map<string, Product>;
  let manager: jest.Mocked<Pick<EntityManager, 'findOne' | 'save'>>;
  let transaction: jest.Mock<
    Promise<Order>,
    [(callback: (manager: EntityManager) => Promise<Order>) => Promise<Order>]
  >;
  let service: OrdersService;

  beforeEach(() => {
    const product = (id: string, price: number, stock: number) =>
      ({ id, name: id, price, stock, isActive: true }) as Product;
    products = new Map([
      ['product-a', product('product-a', 12.5, 5)],
      ['product-b', product('product-b', 3, 4)],
    ]);
    manager = {
      findOne: jest.fn((entity, options) => {
        if (entity === Customer) {
          return Promise.resolve(customer);
        }
        return Promise.resolve(
          products.get(options?.where?.id as string) ?? null,
        );
      }),
      save: jest.fn((target, entity) => Promise.resolve(entity ?? target)),
    };
    transaction = jest.fn((callback) => callback(manager as EntityManager));
    service = new OrdersService(
      {} as Repository<Order>,
      {
        transaction,
      } as DataSource,
    );
  });

  it('merges duplicate products before sorted locking and stock mutation', async () => {
    const order = await service.create({
      customerId: customer.id,
      items: [
        { productId: 'product-b', quantity: 1 },
        { productId: 'product-a', quantity: 2 },
        { productId: 'product-a', quantity: 3 },
      ],
    });

    expect(order.items).toHaveLength(2);
    expect(
      order.items.map(({ productId, quantity }) => ({ productId, quantity })),
    ).toEqual([
      { productId: 'product-a', quantity: 5 },
      { productId: 'product-b', quantity: 1 },
    ]);
    expect(products.get('product-a')?.stock).toBe(0);
    expect(products.get('product-b')?.stock).toBe(3);
    const locks = manager.findOne.mock.calls
      .slice(1)
      .map(([, options]) => options);
    expect(locks).toMatchObject([
      { where: { id: 'product-a' }, lock: { mode: 'pessimistic_write' } },
      { where: { id: 'product-b' }, lock: { mode: 'pessimistic_write' } },
    ]);
  });

  it.each([
    [{ customerId: customer.id, items: [] }, BadRequestException],
    [
      {
        customerId: customer.id,
        items: [{ productId: 'product-a', quantity: 0 }],
      },
      BadRequestException,
    ],
    [
      {
        customerId: customer.id,
        items: [{ productId: 'product-a', quantity: 1.5 }],
      },
      BadRequestException,
    ],
  ])(
    'rejects malformed quantities before a transaction',
    async (dto, error) => {
      await expect(service.create(dto)).rejects.toBeInstanceOf(error);
      expect(transaction).not.toHaveBeenCalled();
      expect(products.get('product-a')?.stock).toBe(5);
    },
  );

  it.each([
    ['missing customer', null, NotFoundException],
    ['inactive product', customer, NotFoundException],
  ])('rejects %s without stock mutation', async (_, customerResult, error) => {
    manager.findOne.mockImplementation((entity) => {
      if (entity === Customer) {
        return Promise.resolve(customerResult);
      }
      return Promise.resolve(null);
    });

    await expect(
      service.create({
        customerId: customer.id,
        items: [{ productId: 'product-a', quantity: 1 }],
      }),
    ).rejects.toBeInstanceOf(error);
    expect(manager.save).not.toHaveBeenCalled();
    expect(products.get('product-a')?.stock).toBe(5);
  });

  it('reports insufficient aggregate stock as a conflict without mutation', async () => {
    await expect(
      service.create({
        customerId: customer.id,
        items: [
          { productId: 'product-a', quantity: 3 },
          { productId: 'product-a', quantity: 3 },
        ],
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(manager.save).not.toHaveBeenCalled();
    expect(products.get('product-a')?.stock).toBe(5);
  });
});
