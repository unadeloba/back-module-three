import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from './entities/customer.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
  ) {}

  async create(createCustomerDto: CreateCustomerDto): Promise<Customer> {
    const { email } = createCustomerDto;
    const existing = await this.customerRepository.findOne({ where: { email } });
    if (existing) {
      throw new BadRequestException(`El cliente con correo electrónico ${email} ya está registrado`);
    }

    const customer = this.customerRepository.create(createCustomerDto);
    return this.customerRepository.save(customer);
  }

  async findAll(): Promise<Customer[]> {
    return this.customerRepository.find({ where: { isActive: true } });
  }

  async findOne(id: string): Promise<Customer> {
    const customer = await this.customerRepository.findOne({ where: { id, isActive: true } });
    if (!customer) {
      throw new NotFoundException(`Cliente con ID ${id} no encontrado o inactivo`);
    }
    return customer;
  }

  async update(id: string, updateCustomerDto: UpdateCustomerDto): Promise<Customer> {
    const customer = await this.findOne(id);

    if (updateCustomerDto.email && updateCustomerDto.email !== customer.email) {
      const existing = await this.customerRepository.findOne({ where: { email: updateCustomerDto.email } });
      if (existing) {
        throw new BadRequestException(`El cliente con correo electrónico ${updateCustomerDto.email} ya está registrado`);
      }
    }

    Object.assign(customer, updateCustomerDto);
    return this.customerRepository.save(customer);
  }

  async remove(id: string): Promise<void> {
    const customer = await this.findOne(id);
    customer.isActive = false;
    await this.customerRepository.save(customer);
  }
}
