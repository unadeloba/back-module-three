import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { configureApp, configureSwagger } from './../src/app.setup';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';

type ProductResponse = {
  id: string;
  description: string | null;
  price: number;
  stock: number;
};
type CustomerResponse = { id: string; phone: string | null; isActive: boolean };
type SwaggerResponse = {
  content?: Record<
    string,
    { schema?: { $ref?: string; type?: string; items?: { $ref?: string } } }
  >;
};
type SwaggerProperty = {
  $ref?: string;
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

type SwaggerMethod = 'delete' | 'get' | 'patch' | 'post';
type OperationExpectation = {
  path: string;
  method: SwaggerMethod;
  request?: string;
  success: string;
  response?: string;
  errors?: string[];
};

const schemaName = (ref?: string) => ref?.replace('#/components/schemas/', '');
const responseSchemaName = (response?: SwaggerResponse) => {
  const schema = response?.content?.['application/json']?.schema;
  return schemaName(schema?.$ref ?? schema?.items?.$ref);
};

const expectOperation = (
  document: SwaggerDocument,
  expectation: OperationExpectation,
) => {
  const operation = document.paths[expectation.path]?.[expectation.method];
  expect(operation).toBeDefined();
  expect(
    schemaName(
      operation?.requestBody?.content?.['application/json']?.schema?.$ref,
    ),
  ).toBe(expectation.request);
  expect(responseSchemaName(operation?.responses?.[expectation.success])).toBe(
    expectation.response,
  );
  for (const status of expectation.errors ?? []) {
    expect(operation?.responses?.[status]).toBeDefined();
  }
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

  it('proves customer updates persist through active detail and list reads', async () => {
    const server = app.getHttpServer();
    const fixtureId = randomUUID();
    const created = await request(server)
      .post('/api/customers')
      .send({
        fullName: `Before ${fixtureId}`,
        email: `before-${fixtureId}@example.com`,
      })
      .expect(201);
    const id = (created.body as CustomerResponse).id;
    const update = {
      fullName: `After ${fixtureId}`,
      email: `after-${fixtureId}@example.com`,
      phone: '555-0199',
    };
    await request(server)
      .patch(`/api/customers/${id}`)
      .send(update)
      .expect(200);
    const detail = await request(server)
      .get(`/api/customers/${id}`)
      .expect(200);
    expect(detail.body).toMatchObject({ id, ...update, isActive: true });
    const list = await request(server).get('/api/customers').expect(200);
    expect(
      (list.body as CustomerResponse[]).find((customer) => customer.id === id),
    ).toMatchObject({
      id,
      ...update,
      isActive: true,
    });
  });

  it('rejects fractional stock without mutating the product', async () => {
    const server = app.getHttpServer();
    const fixtureId = randomUUID();
    const created = await request(server)
      .post('/api/products')
      .send({ name: `Fractional ${fixtureId}`, price: 9.99, stock: 4 })
      .expect(201);
    const id = (created.body as ProductResponse).id;
    await request(server)
      .patch(`/api/products/${id}`)
      .send({ stock: 1.5 })
      .expect(400);
    const persisted = await request(server)
      .get(`/api/products/${id}`)
      .expect(200);
    expect((persisted.body as ProductResponse).stock).toBe(4);
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

  it('proves the exhaustive semantic Swagger matrix', async () => {
    const document = (
      await request(app.getHttpServer()).get('/api/docs-json').expect(200)
    ).body as SwaggerDocument;
    const matrix: OperationExpectation[] = [
      {
        path: '/api/customers',
        method: 'post',
        request: 'CreateCustomerDto',
        success: '201',
        response: 'CustomerResponseDto',
        errors: ['400', '409'],
      },
      {
        path: '/api/customers',
        method: 'get',
        success: '200',
        response: 'CustomerResponseDto',
      },
      {
        path: '/api/customers/{id}',
        method: 'get',
        success: '200',
        response: 'CustomerResponseDto',
        errors: ['400', '404'],
      },
      {
        path: '/api/customers/{id}',
        method: 'patch',
        request: 'UpdateCustomerDto',
        success: '200',
        response: 'CustomerResponseDto',
        errors: ['400', '404', '409'],
      },
      {
        path: '/api/customers/{id}',
        method: 'delete',
        success: '204',
        errors: ['400', '404'],
      },
      {
        path: '/api/products',
        method: 'post',
        request: 'CreateProductDto',
        success: '201',
        response: 'ProductResponseDto',
        errors: ['400'],
      },
      {
        path: '/api/products',
        method: 'get',
        success: '200',
        response: 'ProductResponseDto',
      },
      {
        path: '/api/products/{id}',
        method: 'get',
        success: '200',
        response: 'ProductResponseDto',
        errors: ['400', '404'],
      },
      {
        path: '/api/products/{id}',
        method: 'patch',
        request: 'UpdateProductDto',
        success: '200',
        response: 'ProductResponseDto',
        errors: ['400', '404'],
      },
      {
        path: '/api/products/{id}',
        method: 'delete',
        success: '204',
        errors: ['400', '404'],
      },
      {
        path: '/api/orders',
        method: 'post',
        request: 'CreateOrderDto',
        success: '201',
        response: 'OrderResponseDto',
        errors: ['400', '404', '409'],
      },
      {
        path: '/api/orders',
        method: 'get',
        success: '200',
        response: 'OrderResponseDto',
      },
      {
        path: '/api/orders/{id}',
        method: 'get',
        success: '200',
        response: 'OrderResponseDto',
        errors: ['400', '404'],
      },
      {
        path: '/api/orders/{id}/status',
        method: 'patch',
        request: 'UpdateOrderStatusDto',
        success: '200',
        response: 'OrderResponseDto',
        errors: ['400', '404', '409'],
      },
    ];
    matrix.forEach((expectation) => expectOperation(document, expectation));

    const schemas = document.components.schemas;
    expect(schemas.CreateCustomerDto.required).toEqual(['fullName', 'email']);
    expect(schemas.CreateCustomerDto.properties.fullName).toMatchObject({
      type: 'string',
      maxLength: 255,
    });
    expect(schemas.CreateCustomerDto.properties.email).toMatchObject({
      type: 'string',
      format: 'email',
      maxLength: 255,
    });
    expect(schemas.UpdateCustomerDto.required ?? []).toEqual([]);
    expect(schemas.CreateOrderDto.required).toEqual(['customerId', 'items']);
    expect(schemas.CreateOrderDto.properties.customerId).toMatchObject({
      type: 'string',
      format: 'uuid',
    });
    expect(schemas.CreateOrderDto.properties.items).toMatchObject({
      type: 'array',
      minItems: 1,
    });
    expect(schemas.OrderItemDto.properties.quantity).toMatchObject({
      type: 'integer',
      minimum: 1,
    });
    expect(schemas.UpdateOrderStatusDto.properties.status).toBeDefined();
    expect(schemas.OrderStatus.enum).toEqual([
      'PENDING',
      'CONFIRMED',
      'SHIPPED',
      'DELIVERED',
      'CANCELLED',
    ]);
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

  it('proves the complete order response numeric and status matrix', async () => {
    const server = app.getHttpServer();
    const fixtureId = randomUUID();
    const customer = await request(server)
      .post('/api/customers')
      .send({
        fullName: `Matrix Customer ${fixtureId}`,
        email: `matrix-${fixtureId}@example.com`,
      })
      .expect(201);
    const product = await request(server)
      .post('/api/products')
      .send({ name: `Matrix Product ${fixtureId}`, price: 7.5, stock: 10 })
      .expect(201);
    const createOrder = () =>
      request(server)
        .post('/api/orders')
        .send({
          customerId: (customer.body as CustomerResponse).id,
          items: [
            { productId: (product.body as ProductResponse).id, quantity: 2 },
          ],
        });
    const expectNumericOrder = (order: OrderResponse) => {
      expect(typeof order.total).toBe('number');
      expect(order.total).toBe(15);
      expect(order.items).toHaveLength(1);
      expect(typeof order.items[0].unitPrice).toBe('number');
      expect(order.items[0].unitPrice).toBe(7.5);
      expect(typeof order.items[0].subtotal).toBe('number');
      expect(order.items[0].subtotal).toBe(15);
    };

    const delivered = await createOrder().expect(201);
    const deliveredOrder = delivered.body as OrderResponse;
    expectNumericOrder(deliveredOrder);
    const listed = await request(server).get('/api/orders').expect(200);
    const listedOrder = (listed.body as OrderResponse[]).find(
      ({ id }) => id === deliveredOrder.id,
    );
    expect(listedOrder).toBeDefined();
    expectNumericOrder(listedOrder as OrderResponse);
    const detailed = await request(server)
      .get(`/api/orders/${deliveredOrder.id}`)
      .expect(200);
    expectNumericOrder(detailed.body as OrderResponse);

    const observedStatuses = new Set<string>([deliveredOrder.status]);
    for (const status of ['CONFIRMED', 'SHIPPED', 'DELIVERED'] as const) {
      const updated = await request(server)
        .patch(`/api/orders/${deliveredOrder.id}/status`)
        .send({ status })
        .expect(200);
      expectNumericOrder(updated.body as OrderResponse);
      observedStatuses.add((updated.body as OrderResponse).status);
    }

    const cancelled = await createOrder().expect(201);
    const cancelledOrder = cancelled.body as OrderResponse;
    expectNumericOrder(cancelledOrder);
    const cancelledResponse = await request(server)
      .patch(`/api/orders/${cancelledOrder.id}/status`)
      .send({ status: 'CANCELLED' })
      .expect(200);
    expectNumericOrder(cancelledResponse.body as OrderResponse);
    observedStatuses.add((cancelledResponse.body as OrderResponse).status);
    expect([...observedStatuses].sort()).toEqual([
      'CANCELLED',
      'CONFIRMED',
      'DELIVERED',
      'PENDING',
      'SHIPPED',
    ]);
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

  it('enforces lifecycle transitions and restores concurrent cancellation stock once', async () => {
    const server = app.getHttpServer();
    const suffix = `${Date.now()}-${Math.random()}`;
    const customer = await request(server)
      .post('/api/customers')
      .send({
        fullName: 'Lifecycle Customer',
        email: `lifecycle-${suffix}@example.com`,
      })
      .expect(201);
    const firstProduct = await request(server)
      .post('/api/products')
      .send({ name: `First Lifecycle Product ${suffix}`, price: 10, stock: 10 })
      .expect(201);
    const secondProduct = await request(server)
      .post('/api/products')
      .send({ name: `Second Lifecycle Product ${suffix}`, price: 5, stock: 8 })
      .expect(201);
    const customerId = (customer.body as CustomerResponse).id;
    const firstProductId = (firstProduct.body as ProductResponse).id;
    const secondProductId = (secondProduct.body as ProductResponse).id;
    const orderPayload = {
      customerId,
      items: [
        { productId: secondProductId, quantity: 2 },
        { productId: firstProductId, quantity: 3 },
      ],
    };

    const lifecycleOrder = await request(server)
      .post('/api/orders')
      .send(orderPayload)
      .expect(201);
    const lifecycleOrderId = (lifecycleOrder.body as OrderResponse).id;
    await request(server)
      .patch(`/api/orders/${lifecycleOrderId}/status`)
      .send({ status: 'SHIPPED' })
      .expect(409);
    expect(
      (
        (
          await request(server)
            .get(`/api/orders/${lifecycleOrderId}`)
            .expect(200)
        ).body as OrderResponse
      ).status,
    ).toBe('PENDING');
    expect(
      (
        (
          await request(server)
            .get(`/api/products/${firstProductId}`)
            .expect(200)
        ).body as ProductResponse
      ).stock,
    ).toBe(7);
    await request(server)
      .patch(`/api/orders/${lifecycleOrderId}/status`)
      .send({ status: 'CONFIRMED' })
      .expect(200)
      .expect(({ body }: { body: OrderResponse }) =>
        expect(body.status).toBe('CONFIRMED'),
      );
    await request(server)
      .patch(`/api/orders/${lifecycleOrderId}/status`)
      .send({ status: 'SHIPPED' })
      .expect(200);
    await request(server)
      .patch(`/api/orders/${lifecycleOrderId}/status`)
      .send({ status: 'CANCELLED' })
      .expect(409);
    await request(server)
      .patch(`/api/orders/${lifecycleOrderId}/status`)
      .send({ status: 'DELIVERED' })
      .expect(200);

    const cancellableOrder = await request(server)
      .post('/api/orders')
      .send(orderPayload)
      .expect(201);
    const cancellableOrderId = (cancellableOrder.body as OrderResponse).id;
    const cancellations = await Promise.all([
      request(server)
        .patch(`/api/orders/${cancellableOrderId}/status`)
        .send({ status: 'CANCELLED' }),
      request(server)
        .patch(`/api/orders/${cancellableOrderId}/status`)
        .send({ status: 'CANCELLED' }),
    ]);
    expect(cancellations.map(({ status }) => status).sort()).toEqual([
      200, 409,
    ]);
    expect(
      (
        (
          await request(server)
            .get(`/api/products/${firstProductId}`)
            .expect(200)
        ).body as ProductResponse
      ).stock,
    ).toBe(7);
    expect(
      (
        (
          await request(server)
            .get(`/api/products/${secondProductId}`)
            .expect(200)
        ).body as ProductResponse
      ).stock,
    ).toBe(6);

    const document = (await request(server).get('/api/docs-json').expect(200))
      .body as SwaggerDocument;
    const statusPath = document.paths['/api/orders/{id}/status'].patch;
    expect(statusPath?.responses?.['404']).toBeDefined();
    expect(statusPath?.responses?.['409']).toBeDefined();
  });

  it('preserves restored stock during a queued price-only product update', async () => {
    const server = app.getHttpServer();
    const dataSource = app.get(DataSource);
    const suffix = `${Date.now()}-${Math.random()}`;
    const customer = await request(server)
      .post('/api/customers')
      .send({ fullName: 'Race Customer', email: `race-${suffix}@example.com` })
      .expect(201);
    const product = await request(server)
      .post('/api/products')
      .send({ name: `Race Product ${suffix}`, price: 10, stock: 10 })
      .expect(201);
    const productId = (product.body as ProductResponse).id;
    const order = await request(server)
      .post('/api/orders')
      .send({
        customerId: (customer.body as CustomerResponse).id,
        items: [{ productId, quantity: 3 }],
      })
      .expect(201);
    const orderId = (order.body as OrderResponse).id;
    const waitForBlockedQuery = async (queryPattern: string) => {
      const deadline = Date.now() + 3_000;
      while (Date.now() < deadline) {
        const [{ blocked }] = await dataSource.query<
          Array<{ blocked: boolean }>
        >(
          `SELECT EXISTS (
            SELECT 1 FROM pg_stat_activity
            WHERE datname = current_database()
              AND pid <> pg_backend_pid()
              AND wait_event_type = 'Lock'
              AND query LIKE $1
          ) AS blocked`,
          [queryPattern],
        );
        if (blocked) return;
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      throw new Error(`Timed out waiting for blocked query: ${queryPattern}`);
    };
    const blocker = dataSource.createQueryRunner();
    await blocker.connect();
    await blocker.startTransaction();

    try {
      await blocker.query('SELECT id FROM products WHERE id = $1 FOR UPDATE', [
        productId,
      ]);
      const cancellation = request(server)
        .patch(`/api/orders/${orderId}/status`)
        .send({ status: 'CANCELLED' })
        .then((response) => response);
      await waitForBlockedQuery('%FROM "products"%FOR UPDATE%');
      const priceUpdate = request(server)
        .patch(`/api/products/${productId}`)
        .send({ price: 15 })
        .then((response) => response);
      await waitForBlockedQuery('UPDATE "products"%');
      await blocker.commitTransaction();

      const [cancelled, updated] = await Promise.all([
        cancellation,
        priceUpdate,
      ]);
      expect(cancelled.status).toBe(200);
      expect(updated.status).toBe(200);
      const persisted = await request(server)
        .get(`/api/products/${productId}`)
        .expect(200);
      expect((persisted.body as ProductResponse).stock).toBe(10);
      expect((persisted.body as ProductResponse).price).toBe(15);
    } finally {
      if (blocker.isTransactionActive) await blocker.rollbackTransaction();
      await blocker.release();
    }
  });

  afterEach(async () => {
    await app.close();
  });
});
