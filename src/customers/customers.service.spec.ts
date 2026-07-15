import { ConflictException, NotFoundException } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { Customer } from './entities/customer.entity';

describe('CustomersService', () => {
  const activeCustomer: Customer = {
    id: 'customer-1',
    fullName: 'Ada Lovelace',
    email: 'ada@example.com',
    phone: null,
    isActive: true,
    createdAt: new Date(),
  };
  const repository = {
    create: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
  };
  const service = new CustomersService(repository as never);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('creates an active customer without a phone number and lists active customers', async () => {
    repository.findOne.mockResolvedValue(null);
    repository.create.mockReturnValue(activeCustomer);
    repository.save.mockResolvedValue(activeCustomer);
    repository.find.mockResolvedValue([activeCustomer]);

    await expect(
      service.create({ fullName: 'Ada Lovelace', email: 'ada@example.com' }),
    ).resolves.toEqual(activeCustomer);
    await expect(service.findAll()).resolves.toEqual([activeCustomer]);
    expect(repository.create).toHaveBeenCalledWith({
      fullName: 'Ada Lovelace',
      email: 'ada@example.com',
    });
    expect(repository.find).toHaveBeenCalledWith({ where: { isActive: true } });
  });

  it('returns not found for an inactive customer and soft deletes active customers', async () => {
    repository.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(activeCustomer);
    repository.save.mockResolvedValue(activeCustomer);

    await expect(service.findOne(activeCustomer.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await service.remove(activeCustomer.id);

    expect(activeCustomer.isActive).toBe(false);
    expect(repository.save).toHaveBeenCalledWith(activeCustomer);
  });

  it('rejects duplicate emails on create and update with conflict errors', async () => {
    repository.findOne
      .mockResolvedValueOnce(activeCustomer)
      .mockResolvedValueOnce(activeCustomer)
      .mockResolvedValueOnce({
        ...activeCustomer,
        id: 'customer-2',
        email: 'grace@example.com',
      });

    await expect(
      service.create({ fullName: 'Ada Lovelace', email: 'ada@example.com' }),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      service.update(activeCustomer.id, { email: 'grace@example.com' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.save).not.toHaveBeenCalled();
  });
});
