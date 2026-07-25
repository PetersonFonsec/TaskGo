import { Test, TestingModule } from '@nestjs/testing';

import { AddressController } from './address.controller';
import { AddressService } from './address.service';

describe('AddressController authenticated ownership boundary', () => {
  let controller: AddressController;
  const addressService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AddressController],
      providers: [{ provide: AddressService, useValue: addressService }],
    }).compile();

    controller = module.get<AddressController>(AddressController);
  });

  it('passes token-derived identity to create and ignores injected ownership', async () => {
    const payload = {
      label: 'Home',
      street: 'Main',
      number: '10',
      city: 'Sao Paulo',
      state: 'SP',
      cep: '01001000',
      lat: -23.55,
      lng: -46.63,
      userId: BigInt(20),
    };

    await controller.create('10', payload);

    expect(addressService.create).toHaveBeenCalledWith(BigInt(10), payload);
  });

  it('passes token-derived identity separately from pagination query', async () => {
    const query = {
      page: 2,
      limit: 5,
      sortBy: 'createdAt',
      order: 'desc' as const,
      userId: '20',
    };

    await controller.findAll('10', query);

    expect(addressService.findAll).toHaveBeenCalledWith(BigInt(10), query);
  });

  it('passes token-derived identity to read, update, and delete', async () => {
    await controller.findOne('10', '7');
    await controller.update('10', '7', {
      city: 'Campinas',
      userId: BigInt(20),
    });
    await controller.remove('10', '7');

    expect(addressService.findOne).toHaveBeenCalledWith(BigInt(10), BigInt(7));
    expect(addressService.update).toHaveBeenCalledWith(BigInt(10), BigInt(7), {
      city: 'Campinas',
      userId: BigInt(20),
    });
    expect(addressService.remove).toHaveBeenCalledWith(BigInt(10), BigInt(7));
  });
});
