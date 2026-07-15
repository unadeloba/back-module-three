import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { configureApp, configureSwagger } from './../src/app.setup';

type ProductResponse = {
  id: string;
  description: string | null;
  price: number;
  stock: number;
};
type CustomerResponse = { id: string; phone: string | null; isActive: boolean };
type SwaggerResponse = {
  content?: Record<string, { schema?: { $ref?: string } }>;
};
type SwaggerProperty = {
  type?: string;
  enum?: string[];
  maxLength?: number;
  minLength?: number;
  minimum?: number;
};
type SwaggerOperation = {
  requestBody?: SwaggerResponse;
  responses?: Record<string, SwaggerResponse>;
};
type SwaggerDocument = {
  paths: Record<
    string,
    {
      delete?: SwaggerOperation;
      get?: SwaggerOperation;
      patch?: SwaggerOperation;
      post?: SwaggerOperation;
    }
  >;
  components: {
    schemas: Record<
      string,
      {
        properties: Record<string, SwaggerProperty>;
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
    productId: string;
    quantity: number;
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

  it('manages products with optional descriptions, validation no-writes, and soft deletion', async () => {
    const server = app.getHttpServer();
    const suffix = `${Date.now()}-${Math.random()}`;
    const created = await request(server)
      .post('/api/products')
      .send({ name: `Product ${suffix}`, price: '12.50', stock: 0 })
      .expect(201);
    const product = created.body as ProductResponse;
    expect(product.price).toBe(12.5);
    expect(product.description).toBeNull();
    expect(product.stock).toBe(0);

    const updated = await request(server)
      .patch(`/api/products/${product.id}`)
      .send({ description: 'Compact keyboard', price: 15.75, stock: 2 })
      .expect(200);
    expect((updated.body as ProductResponse).description).toBe(
      'Compact keyboard',
    );
    expect((updated.body as ProductResponse).price).toBe(15.75);
    expect((updated.body as ProductResponse).stock).toBe(2);
    await request(server)
      .post('/api/products')
      .send({ name: 'Invalid Price', price: 0, stock: 1 })
      .expect(400);
    await request(server)
      .patch(`/api/products/${product.id}`)
      .send({ name: '' })
      .expect(400);
    await request(server)
      .patch(`/api/products/${product.id}`)
      .send({ stock: -1 })
      .expect(400);
    const productAfterInvalid = await request(server)
      .get(`/api/products/${product.id}`)
      .expect(200);
    expect(
      (productAfterInvalid.body as ProductResponse & { name: string }).name,
    ).toBe(`Product ${suffix}`);
    expect((productAfterInvalid.body as ProductResponse).stock).toBe(2);
    await request(server).delete(`/api/products/${product.id}`).expect(204);
    await request(server).get(`/api/products/${product.id}`).expect(404);
    const activeProducts = await request(server)
      .get('/api/products')
      .expect(200);
    expect(
      (activeProducts.body as ProductResponse[]).map(({ id }) => id),
    ).not.toContain(product.id);

    const document = (await request(server).get('/api/docs-json').expect(200))
      .body as SwaggerDocument;
    const productSchema = document.components.schemas.ProductResponseDto;
    expect(productSchema.properties.id.type).toBe('string');
    expect(productSchema.properties.description.type).toBe('string');
    expect(productSchema.properties.price.type).toBe('number');
    expect(productSchema.properties.stock.type).toBe('integer');
    expect(productSchema.properties.isActive.type).toBe('boolean');
    expect(productSchema.properties.createdAt.type).toBe('string');
    expect(productSchema.required).not.toContain('description');
    const productPaths = document.paths;
    expect(
      productPaths['/api/products'].post?.requestBody?.content?.[
        'application/json'
      ]?.schema?.$ref,
    ).toBe('#/components/schemas/CreateProductDto');
    expect(
      productPaths['/api/products'].post?.responses?.['201']?.content?.[
        'application/json'
      ]?.schema?.$ref,
    ).toBe('#/components/schemas/ProductResponseDto');
    expect(
      productPaths['/api/products'].post?.responses?.['400'],
    ).toBeDefined();
    expect(
      productPaths['/api/products/{id}'].get?.responses?.['200']?.content?.[
        'application/json'
      ]?.schema?.$ref,
    ).toBe('#/components/schemas/ProductResponseDto');
    expect(
      productPaths['/api/products/{id}'].get?.responses?.['400'],
    ).toBeDefined();
    expect(
      productPaths['/api/products/{id}'].get?.responses?.['404'],
    ).toBeDefined();
    expect(
      productPaths['/api/products/{id}'].patch?.requestBody?.content?.[
        'application/json'
      ]?.schema?.$ref,
    ).toBe('#/components/schemas/UpdateProductDto');
    expect(
      productPaths['/api/products/{id}'].patch?.responses?.['200'],
    ).toBeDefined();
    expect(
      productPaths['/api/products/{id}'].patch?.responses?.['400'],
    ).toBeDefined();
    expect(
      productPaths['/api/products/{id}'].patch?.responses?.['404'],
    ).toBeDefined();
    expect(
      productPaths['/api/products/{id}'].delete?.responses?.['204'],
    ).toBeDefined();
    expect(
      productPaths['/api/products/{id}'].delete?.responses?.['400'],
    ).toBeDefined();
    expect(
      productPaths['/api/products/{id}'].delete?.responses?.['404'],
    ).toBeDefined();
    const expectProductRequestSchema = (
      schema: (typeof document.components.schemas)[string],
      required: string[],
    ) => {
      expect(schema.properties.name).toMatchObject({
        type: 'string',
        minLength: 1,
        maxLength: 255,
      });
      expect(schema.properties.description.type).toBe('string');
      expect(schema.properties.price).toMatchObject({
        type: 'number',
        minimum: 0.01,
      });
      expect(schema.properties.stock).toMatchObject({
        type: 'integer',
        minimum: 0,
      });
      expect(schema.required ?? []).toEqual(
        required.length ? expect.arrayContaining(required) : [],
      );
      expect(schema.required ?? []).not.toContain('description');
    };

    expectProductRequestSchema(document.components.schemas.CreateProductDto, [
      'name',
      'price',
      'stock',
    ]);
    expectProductRequestSchema(
      document.components.schemas.UpdateProductDto,
      [],
    );
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

  it('creates immutable price snapshots without overselling or partial stock writes', async () => {
    const server = app.getHttpServer();
    const suffix = `${Date.now()}-${Math.random()}`;
    const customer = await request(server)
      .post('/api/customers')
      .send({
        fullName: 'Atomic Customer',
        email: `atomic-${suffix}@example.com`,
      })
      .expect(201);
    const product = await request(server)
      .post('/api/products')
      .send({ name: `Atomic Product ${suffix}`, price: 10, stock: 5 })
      .expect(201);
    const customerId = (customer.body as CustomerResponse).id;
    const productId = (product.body as ProductResponse).id;
    const orderPayload = { customerId, items: [{ productId, quantity: 3 }] };
    const insufficientPayload = {
      customerId,
      items: [{ productId, quantity: 6 }],
    };
    const ordersBefore = await request(server).get('/api/orders').expect(200);
    const orderCountBefore = (ordersBefore.body as OrderResponse[]).length;

    await request(server)
      .post('/api/orders')
      .send(insufficientPayload)
      .expect(409);
    const afterInsufficient = await request(server)
      .get(`/api/products/${productId}`)
      .expect(200);
    expect((afterInsufficient.body as ProductResponse).stock).toBe(5);
    const ordersAfterInsufficient = await request(server)
      .get('/api/orders')
      .expect(200);
    expect(ordersAfterInsufficient.body as OrderResponse[]).toHaveLength(
      orderCountBefore,
    );

    const concurrent = await Promise.all([
      request(server).post('/api/orders').send(orderPayload),
      request(server).post('/api/orders').send(orderPayload),
    ]);
    expect(concurrent.map(({ status }) => status).sort()).toEqual([201, 409]);
    const created = concurrent.find(({ status }) => status === 201);
    expect(created).toBeDefined();
    const order = created?.body as OrderResponse;
    expect(order.items).toEqual([
      expect.objectContaining({
        productId,
        quantity: 3,
        unitPrice: 10,
        subtotal: 30,
      }),
    ]);
    expect(order.total).toBe(30);
    const afterConcurrent = await request(server)
      .get(`/api/products/${productId}`)
      .expect(200);
    expect((afterConcurrent.body as ProductResponse).stock).toBe(2);

    await request(server)
      .patch(`/api/products/${productId}`)
      .send({ price: 20 })
      .expect(200);
    const persisted = await request(server)
      .get(`/api/orders/${order.id}`)
      .expect(200);
    expect((persisted.body as OrderResponse).items).toEqual([
      expect.objectContaining({
        productId,
        quantity: 3,
        unitPrice: 10,
        subtotal: 30,
      }),
    ]);
    expect((persisted.body as OrderResponse).total).toBe(30);
    await request(server).patch(`/api/orders/${order.id}/items`).expect(404);

    const document = (await request(server).get('/api/docs-json').expect(200))
      .body as SwaggerDocument;
    expect(
      document.paths['/api/orders'].post?.responses?.['409'],
    ).toBeDefined();
  });

  afterEach(async () => {
    await app.close();
  });
});
