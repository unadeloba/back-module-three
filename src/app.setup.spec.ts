import { ValidationPipe } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsInt, IsString } from 'class-validator';
import { SwaggerModule } from '@nestjs/swagger';
import { configureApp, configureSwagger } from './app.setup';

class NumericPayload {
  @IsString()
  name: string;

  @Type(() => Number)
  @IsInt()
  quantity: number;
}

describe('configureApp', () => {
  it('sets the /api prefix and transforms whitelisted payload values', async () => {
    let configuredPipe: ValidationPipe;
    const app = {
      setGlobalPrefix: jest.fn(),
      useGlobalPipes: jest.fn((pipe: ValidationPipe) => {
        configuredPipe = pipe;
      }),
    };

    configureApp(app as never);

    expect(app.setGlobalPrefix).toHaveBeenCalledWith('api');
    await expect(
      configuredPipe.transform(
        { name: 'Keyboard', quantity: '3' },
        { metatype: NumericPayload, type: 'body', data: '' },
      ),
    ).resolves.toMatchObject({ quantity: 3 });
  });

  it('rejects undeclared payload fields before they reach a controller', async () => {
    let configuredPipe: ValidationPipe;
    const app = {
      setGlobalPrefix: jest.fn(),
      useGlobalPipes: jest.fn((pipe: ValidationPipe) => {
        configuredPipe = pipe;
      }),
    };

    configureApp(app as never);

    await expect(
      configuredPipe.transform(
        { name: 'Keyboard', quantity: 3, unexpected: true },
        { metatype: NumericPayload, type: 'body', data: '' },
      ),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('registers a Swagger document at /api/docs', () => {
    const app = {};
    const createDocument = jest
      .spyOn(SwaggerModule, 'createDocument')
      .mockReturnValue({} as never);
    const setup = jest.spyOn(SwaggerModule, 'setup').mockImplementation();

    configureSwagger(app as never);

    expect(createDocument).toHaveBeenCalledWith(app, expect.any(Object), {
      deepScanRoutes: true,
    });
    expect(setup).toHaveBeenCalledWith('api/docs', app, expect.any(Object));
  });
});
