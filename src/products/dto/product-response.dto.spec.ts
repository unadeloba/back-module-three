import 'reflect-metadata';
import { ProductResponseDto } from './product-response.dto';

describe('ProductResponseDto', () => {
  it('documents the persisted product response fields and optional description', () => {
    const metadata = Reflect.getMetadata(
      'swagger/apiModelPropertiesArray',
      ProductResponseDto.prototype,
    ) as string[];

    expect(metadata).toEqual(
      expect.arrayContaining([
        ':id',
        ':name',
        ':description',
        ':price',
        ':stock',
        ':isActive',
        ':createdAt',
      ]),
    );
  });
});
