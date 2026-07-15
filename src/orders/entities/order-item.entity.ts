import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type { Order } from './order.entity';
import {
  Product,
  ColumnNumericTransformer,
} from '../../products/entities/product.entity';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne('Order', 'items', { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ name: 'order_id', type: 'uuid', nullable: false })
  orderId: string;

  @ManyToOne(() => Product, { nullable: false, eager: true })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'product_id', type: 'uuid', nullable: false })
  productId: string;

  @Column({ type: 'integer', nullable: false })
  quantity: number;

  @Column({
    name: 'price',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: false,
    transformer: new ColumnNumericTransformer(),
  })
  unitPrice: number;
}
