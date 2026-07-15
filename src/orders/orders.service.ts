import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Order, OrderStatus } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { Customer } from '../customers/entities/customer.entity';
import { Product } from '../products/entities/product.entity';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly dataSource: DataSource,
  ) {}

  async create(createOrderDto: CreateOrderDto): Promise<Order> {
    const { customerId, items } = createOrderDto;

    return await this.dataSource.transaction(async (transactionalEntityManager) => {
      // 1. Verify Customer exists and is active
      const customer = await transactionalEntityManager.findOne(Customer, {
        where: { id: customerId, isActive: true },
      });
      if (!customer) {
        throw new BadRequestException(`El cliente con ID ${customerId} no existe o está inactivo`);
      }

      let total = 0;
      const orderItemsToSave: OrderItem[] = [];

      // 2. Loop through items to validate and deduct stock
      for (const item of items) {
        const { productId, quantity } = item;

        const product = await transactionalEntityManager.findOne(Product, {
          where: { id: productId, isActive: true },
          lock: { mode: 'pessimistic_write' },
        });

        if (!product) {
          throw new BadRequestException(`El producto con ID ${productId} no existe o está inactivo`);
        }

        if (product.stock < quantity) {
          throw new BadRequestException(
            `Stock insuficiente para el producto "${product.name}". Solicitado: ${quantity}, Disponible: ${product.stock}`,
          );
        }

        product.stock -= quantity;
        await transactionalEntityManager.save(Product, product);

        const itemTotal = product.price * quantity;
        total += itemTotal;

        const orderItem = new OrderItem();
        orderItem.product = product;
        orderItem.productId = productId;
        orderItem.quantity = quantity;
        orderItem.unitPrice = product.price;

        orderItemsToSave.push(orderItem);
      }

      // 3. Create the Order
      const order = new Order();
      order.customer = customer;
      order.customerId = customerId;
      order.total = total;
      order.status = OrderStatus.PENDING;
      order.items = orderItemsToSave;

      return await transactionalEntityManager.save(Order, order);
    });
  }

  async findAll(): Promise<Order[]> {
    return this.orderRepository.find({
      relations: {
        customer: true,
        items: {
          product: true,
        },
      },
      order: { orderDate: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: {
        customer: true,
        items: {
          product: true,
        },
      },
    });
    if (!order) {
      throw new NotFoundException(`Pedido con ID ${id} no encontrado`);
    }
    return order;
  }

  async updateStatus(id: string, status: OrderStatus): Promise<Order> {
    const order = await this.findOne(id);
    order.status = status;
    return this.orderRepository.save(order);
  }
}
