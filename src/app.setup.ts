import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export const API_PREFIX = 'api';
export const SWAGGER_PATH = `${API_PREFIX}/docs`;

export function configureApp(app: INestApplication): void {
  app.enableCors();
  app.setGlobalPrefix(API_PREFIX);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      forbidNonWhitelisted: true,
    }),
  );
}

export function configureSwagger(app: INestApplication): void {
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Phoenix Orders API')
      .setDescription('Customer, product, and order operations.')
      .setVersion('1.0')
      .build(),
    { deepScanRoutes: true },
  );

  SwaggerModule.setup(SWAGGER_PATH, app, document);
}
