import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { configureApp, configureSwagger } from './../src/app.setup';

type ProductResponse = { price: number };
type CustomerResponse = { id: string; phone: string | null; isActive: boolean };
type SwaggerDocument = {
  paths: Record<string, unknown>;
  components: {
    schemas: Record<
      string,
      {
        properties: Record<string, { type?: string; enum?: string[] }>;
        enum?: string[];
        required?: string[];
      }
    >;
  };
};

type OrderResponse = {
  id: string;
  status: string;
  total: number;
  items: Array<{
    unitPrice: number;
    subtotal: number;
  }>;
};

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    configureSwagger(app);
    await app.init();
  });

  it('/api (GET)', () => {
    return request(app.getHttpServer())
      .get('/api')
      .expect(200)
      .expect('Hello World!');
  });

  it('rejects malformed UUIDs and undeclared fields without creating a customer', async () => {
    const server = app.getHttpServer();
    const customersBefore = await request(server)
      .get('/api/customers')
      .expect(200);
    const customerCountBefore = (customersBefore.body as unknown[]).length;

    await request(server).get('/api/customers/not-a-uuid').expect(400);
    await request(server)
      .post('/api/customers')
      .send({
        fullName: 'Invalid Customer',
        email: 'invalid@example.com',
        unexpected: true,
      })
      .expect(400);

    const customersAfter = await request(server)
      .get('/api/customers')
      .expect(200);
    expect(customersAfter.body as unknown[]).toHaveLength(customerCountBefore);
  });

  it('serializes existing product prices as JSON numbers', async () => {
    const server = app.getHttpServer();
    const suffix = `${Date.now()}-${Math.random()}`;
    const created = await request(server)
      .post('/api/products')
      .send({ name: `Numeric Product ${suffix}`, price: '25.50', stock: '4' })
      .expect(201);
    const product = created.body as ProductResponse;

    expect(product.price).toBe(25.5);
    expect(typeof product.price).toBe('number');
  });

  it('manages active customers, rejects invalid and duplicate writes, and soft deletes', async () => {
    const server = app.getHttpServer();
    const suffix = `${Date.now()}-${Math.random()}`;
    const customer = await request(server)
      .post('/api/customers')
      .send({
        fullName: 'Customer One',
        email: `customer-one-${suffix}@example.com`,
      })
      .expect(201);
    const customerResponse = customer.body as CustomerResponse;

    expect(customerResponse.phone).toBeNull();
    expect(customerResponse.isActive).toBe(true);

    await request(server)
      .post('/api/customers')
      .send({
        fullName: 'Customer Duplicate',
        email: `customer-one-${suffix}@example.com`,
      })
      .expect(409);

    const secondCustomer = await request(server)
      .post('/api/customers')
      .send({
        fullName: 'Customer Two',
        email: `customer-two-${suffix}@example.com`,
        phone: '555-0102',
      })
      .expect(201);

    await request(server)
      .patch(`/api/customers/${(secondCustomer.body as CustomerResponse).id}`)
      .send({ email: `customer-one-${suffix}@example.com` })
      .expect(409);

    const customersBeforeInvalid = await request(server)
      .get('/api/customers')
      .expect(200);
    const countBeforeInvalid = (
      customersBeforeInvalid.body as CustomerResponse[]
    ).length;
    await request(server)
      .post('/api/customers')
      .send({ fullName: 'Invalid Customer', email: 'not-an-email' })
      .expect(400);
    const customersAfterInvalid = await request(server)
      .get('/api/customers')
      .expect(200);
    expect(customersAfterInvalid.body as CustomerResponse[]).toHaveLength(
      countBeforeInvalid,
    );

    await request(server)
      .delete(`/api/customers/${customerResponse.id}`)
      .expect(204);
    await request(server)
      .get(`/api/customers/${customerResponse.id}`)
      .expect(404);
    const activeCustomers = await request(server)
      .get('/api/customers')
      .expect(200);
    expect(
      (activeCustomers.body as CustomerResponse[]).map(({ id }) => id),
    ).not.toContain(customerResponse.id);

    const document = (await request(server).get('/api/docs-json').expect(200))
      .body as SwaggerDocument;
    const customerSchema = document.components.schemas.CustomerResponseDto;
    expect(customerSchema.properties.id.type).toBe('string');
    expect(customerSchema.properties.fullName.type).toBe('string');
    expect(customerSchema.properties.email.type).toBe('string');
    expect(customerSchema.properties.phone.type).toBe('string');
    expect(customerSchema.properties.isActive.type).toBe('boolean');
    expect(customerSchema.properties.createdAt.type).toBe('string');
    expect(customerSchema.required).not.toContain('phone');
  });

  it('publishes the runtime /api paths in Swagger', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/docs-json')
      .expect(200);
    const document = response.body as SwaggerDocument;

    expect(document.paths['/api/customers']).toBeDefined();
    expect(document.paths['/api/products']).toBeDefined();
    expect(document.paths['/api/orders']).toBeDefined();
  });

  it('returns canonical numeric order responses and documents their Swagger schema', async () => {
    const server = app.getHttpServer();
    const suffix = `${Date.now()}-${Math.random()}`;
    const customer = await request(server)
      .post('/api/customers')
      .send({ fullName: 'Order Customer', email: `${suffix}@example.com` })
      .expect(201);
    const product = await request(server)
      .post('/api/products')
      .send({ name: `Order Product ${suffix}`, price: 12.5, stock: 4 })
      .expect(201);

    const created = await request(server)
      .post('/api/orders')
      .send({
        customerId: (customer.body as { id: string }).id,
        items: [
          { productId: (product.body as { id: string }).id, quantity: 2 },
        ],
      })
      .expect(201);
    const order = created.body as OrderResponse;

    expect(order.status).toBe('PENDING');
    expect(order.total).toBe(25);
    expect(order.items).toEqual([
      expect.objectContaining({ unitPrice: 12.5, subtotal: 25 }),
    ]);

    const document = (await request(server).get('/api/docs-json').expect(200))
      .body as SwaggerDocument;
    const orderSchema = document.components.schemas.OrderResponseDto;
    const itemSchema = document.components.schemas.OrderItemResponseDto;

    expect(orderSchema.properties.total.type).toBe('number');
    expect(document.components.schemas.OrderStatus.enum).toContain('SHIPPED');
    expect(itemSchema.properties.unitPrice.type).toBe('number');
    expect(itemSchema.properties.subtotal.type).toBe('number');
  });

  afterEach(async () => {
    await app.close();
  });
});
