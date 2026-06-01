import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AddressService } from './address.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('AddressService', () => {
  let service: AddressService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      address: {
        updateMany: jest.fn(),
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(async (cb) => cb(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AddressService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AddressService>(AddressService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates address with isDefault=true and clears existing default for the same user', async () => {
    const payload = {
      label: 'Casa',
      street: 'Rua A',
      number: '123',
      city: 'Sao Paulo',
      state: 'SP',
      cep: '01000-000',
      lat: -23.55,
      lng: -46.63,
      isDefault: true,
      userId: BigInt(1),
    } as any;

    const expectedResult = { id: BigInt(1), ...payload };
    prisma.address.create.mockResolvedValue(expectedResult);

    const result = await service.create(payload);

    expect(prisma.address.updateMany).toHaveBeenCalledWith({
      where: { userId: BigInt(1), isDefault: true },
      data: { isDefault: false },
    });
    expect(prisma.address.create).toHaveBeenCalledWith({ data: expect.objectContaining({ label: 'Casa', isDefault: true, userId: BigInt(1) }) });
    expect(result).toEqual(expectedResult);
  });

  it('updates address to isDefault=true and clears previous default for the same user', async () => {
    const addressId = BigInt(2);
    prisma.address.findUnique.mockResolvedValue({ id: addressId, userId: BigInt(1) });
    prisma.address.update.mockResolvedValue({ id: addressId, isDefault: true });

    const result = await service.update(addressId, { isDefault: true } as any);

    expect(prisma.address.updateMany).toHaveBeenCalledWith({
      where: { userId: BigInt(1), isDefault: true },
      data: { isDefault: false },
    });
    expect(prisma.address.update).toHaveBeenCalledWith({
      where: { id: addressId },
      data: { isDefault: true },
    });
    expect(result).toEqual({ id: addressId, isDefault: true });
  });

  it('throws when setting isDefault=true without a userId on create', async () => {
    const payload = {
      label: 'Casa',
      street: 'Rua A',
      number: '123',
      city: 'Sao Paulo',
      state: 'SP',
      cep: '01000-000',
      lat: -23.55,
      lng: -46.63,
      isDefault: true,
    } as any;

    await expect(service.create(payload)).rejects.toThrow(BadRequestException);
    expect(prisma.address.create).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when updating non-existent address', async () => {
    const addressId = BigInt(3);
    prisma.address.findUnique.mockResolvedValue(null);

    await expect(service.update(addressId, { isDefault: true } as any)).rejects.toThrow(NotFoundException);
    expect(prisma.address.update).not.toHaveBeenCalled();
  });
});
