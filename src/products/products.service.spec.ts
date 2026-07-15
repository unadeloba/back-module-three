import { NotFoundException } from '@nestjs/common';
import { Product } from './entities/product.entity';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  const activeProduct: Product = {
    id: 'product-1',
    name: 'Compact Keyboard',
    description: null,
    price: 12.5,
    stock: 0,
    isActive: true,
    createdAt: new Date(),
  };
  const repository = {
    create: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
  };
  const service = new ProductsService(repository as never);

  beforeEach(() => {
    jest.resetAllMocks();
    activeProduct.isActive = true;
  });

  it('creates and updates an active zero-stock product with an optional description', async () => {
    repository.create.mockReturnValue(activeProduct);
    repository.save.mockResolvedValue(activeProduct);
    repository.findOne.mockResolvedValue(activeProduct);
    repository.find.mockResolvedValue([activeProduct]);

    await expect(
      service.create({ name: 'Compact Keyboard', price: 12.5, stock: 0 }),
    ).resolves.toEqual(activeProduct);
    await expect(
      service.update(activeProduct.id, {
        description: 'Mechanical keyboard',
        price: 15.75,
        stock: 2,
      }),
    ).resolves.toMatchObject({
      description: 'Mechanical keyboard',
      price: 15.75,
      stock: 2,
    });
    await expect(service.findAll()).resolves.toEqual([activeProduct]);
    expect(repository.find).toHaveBeenCalledWith({ where: { isActive: true } });
  });

  it('excludes inactive products and soft deletes active products', async () => {
    repository.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(activeProduct);
    repository.save.mockResolvedValue(activeProduct);

    await expect(service.findOne(activeProduct.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await service.remove(activeProduct.id);

    expect(activeProduct.isActive).toBe(false);
    expect(repository.save).toHaveBeenCalledWith(activeProduct);
  });
});
