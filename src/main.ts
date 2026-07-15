import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp, configureSwagger } from './app.setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  configureApp(app);
  configureSwagger(app);

  const port = process.env.PORT ?? 3000;
  // TODO(security): cuando se ejecuten pruebas locales fuera de Docker, escuchar en 127.0.0.1
  const host = process.env.HOST ?? '0.0.0.0';

  await app.listen(port, host);
}
void bootstrap();
