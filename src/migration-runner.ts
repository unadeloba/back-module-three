import { DataSource } from 'typeorm';
import { Customer } from './customers/entities/customer.entity';
import { Order } from './orders/entities/order.entity';
import { OrderItem } from './orders/entities/order-item.entity';
import { InitialSchema1710000000000 } from './migrations/1710000000000-initial-schema';
import { Product } from './products/entities/product.entity';

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false },
  entities: [Customer, Product, Order, OrderItem],
  migrations: [InitialSchema1710000000000],
});

async function run(): Promise<void> {
  await dataSource.initialize();
  await dataSource.runMigrations();
  await dataSource.destroy();
}

void run();
