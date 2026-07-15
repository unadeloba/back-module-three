import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { configureApp, configureSwagger } from './../src/app.setup';

type ProductResponse = { price: number };
type SwaggerDocument = {
  paths: Record<string, unknown>;
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

  it('publishes the runtime /api paths in Swagger', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/docs-json')
      .expect(200);
    const document = response.body as SwaggerDocument;

    expect(document.paths['/api/customers']).toBeDefined();
    expect(document.paths['/api/products']).toBeDefined();
    expect(document.paths['/api/orders']).toBeDefined();
  });

  afterEach(async () => {
    await app.close();
  });
});
