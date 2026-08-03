import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { AddressService } from './address.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('AddressService ownership', () => {
  let service: AddressService;
  let prisma: {
    address: {
      count: jest.Mock;
      findMany: jest.Mock;
      updateMany: jest.Mock;
      create: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      address: {
        count: jest.fn(),
        findMany: jest.fn(),
        updateMany: jest.fn(),
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      $transaction: jest.fn(async (input: unknown) =>
        Array.isArray(input) ? Promise.all(input) : input(prisma),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [AddressService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<AddressService>(AddressService);
  });

  it('scopes count and rows to the authenticated user despite injected query ownership', async () => {
    prisma.address.count.mockResolvedValue(1);
    prisma.address.findMany.mockResolvedValue([{ id: BigInt(7) }]);

    const result = await service.findAll(BigInt(10), {
      page: 1,
      limit: 10,
      userId: '20',
    } as never);

    expect(prisma.address.count).toHaveBeenCalledWith({
      where: { userId: BigInt(10) },
    });
    expect(prisma.address.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: BigInt(10) },
        skip: 0,
        take: 10,
      }),
    );
    expect(result.meta.total).toBe(1);
  });

  it('combines search filters with mandatory ownership', async () => {
    prisma.address.count.mockResolvedValue(0);
    prisma.address.findMany.mockResolvedValue([]);

    await service.findAll(BigInt(10), {
      search: 'city=Sao Paulo',
    });

    expect(prisma.address.count).toHaveBeenCalledWith({
      where: {
        AND: [
          { userId: BigInt(10) },
          {
            OR: [
              {
                city: {
                  contains: 'Sao Paulo',
                  mode: 'insensitive',
                },
              },
            ],
          },
        ],
      },
    });
  });

  it('creates with authenticated ownership and strips injected userId', async () => {
    const payload = addressPayload({
      userId: BigInt(20),
      unexpected: 'ignored',
    });
    prisma.address.create.mockResolvedValue({ id: BigInt(7) });

    await service.create(BigInt(10), payload);

    expect(prisma.address.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        label: 'Home',
        userId: BigInt(10),
      }),
    });
    const data = prisma.address.create.mock.calls[0][0].data;
    expect(data).not.toHaveProperty('unexpected');
    expect(data.userId).not.toBe(BigInt(20));
  });

  it('clears defaults only for the owner within create transaction', async () => {
    await service.create(BigInt(10), addressPayload({ isDefault: true }));

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.address.updateMany).toHaveBeenCalledWith({
      where: { userId: BigInt(10), isDefault: true },
      data: { isDefault: false },
    });
  });

  it('returns an address to its owner', async () => {
    prisma.address.findUnique.mockResolvedValue({
      id: BigInt(7),
      userId: BigInt(10),
    });
    prisma.address.findFirst.mockResolvedValue({
      id: BigInt(7),
      userId: BigInt(10),
      city: 'Sao Paulo',
    });

    await expect(service.findOne(BigInt(10), BigInt(7))).resolves.toEqual(
      expect.objectContaining({ city: 'Sao Paulo' }),
    );
    expect(prisma.address.findFirst).toHaveBeenCalledWith({
      where: { id: BigInt(7), userId: BigInt(10) },
    });
  });

  it('rejects cross-user reads without returning record data', async () => {
    prisma.address.findUnique.mockResolvedValue({
      id: BigInt(7),
      userId: BigInt(20),
    });

    await expect(service.findOne(BigInt(10), BigInt(7))).rejects.toThrow(
      ForbiddenException,
    );
    expect(prisma.address.findFirst).not.toHaveBeenCalled();
  });

  it('updates with an atomic owner predicate and strips ownership transfer', async () => {
    ownedAddress();
    prisma.address.update.mockResolvedValue({ id: BigInt(7) });

    await service.update(BigInt(10), BigInt(7), {
      city: 'Campinas',
      userId: BigInt(20),
      unexpected: 'ignored',
    } as never);

    expect(prisma.address.update).toHaveBeenCalledWith({
      where: { id: BigInt(7), userId: BigInt(10) },
      data: { city: 'Campinas' },
    });
  });

  it('changes default atomically and clears only owner defaults', async () => {
    ownedAddress();

    await service.update(BigInt(10), BigInt(7), { isDefault: true });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.address.updateMany).toHaveBeenCalledWith({
      where: { userId: BigInt(10), isDefault: true },
      data: { isDefault: false },
    });
    expect(prisma.address.update).toHaveBeenCalledWith({
      where: { id: BigInt(7), userId: BigInt(10) },
      data: { isDefault: true },
    });
  });

  it('deletes with an atomic owner predicate', async () => {
    ownedAddress();

    await service.remove(BigInt(10), BigInt(7));

    expect(prisma.address.delete).toHaveBeenCalledWith({
      where: { id: BigInt(7), userId: BigInt(10) },
    });
  });

  it.each(['update', 'remove'] as const)(
    'rejects cross-user %s without performing a write',
    async (operation) => {
      prisma.address.findUnique.mockResolvedValue({
        id: BigInt(7),
        userId: BigInt(20),
      });

      const action =
        operation === 'update'
          ? service.update(BigInt(10), BigInt(7), { city: 'Campinas' })
          : service.remove(BigInt(10), BigInt(7));

      await expect(action).rejects.toThrow(ForbiddenException);
      expect(
        prisma.address[operation === 'update' ? 'update' : 'delete'],
      ).not.toHaveBeenCalled();
    },
  );

  it.each(['update', 'remove'] as const)(
    'returns not found for nonexistent %s without performing a write',
    async (operation) => {
      prisma.address.findUnique.mockResolvedValue(null);

      const action =
        operation === 'update'
          ? service.update(BigInt(10), BigInt(999), { city: 'Campinas' })
          : service.remove(BigInt(10), BigInt(999));

      await expect(action).rejects.toThrow(NotFoundException);
      expect(
        prisma.address[operation === 'update' ? 'update' : 'delete'],
      ).not.toHaveBeenCalled();
    },
  );

  function ownedAddress() {
    prisma.address.findUnique.mockResolvedValue({
      id: BigInt(7),
      userId: BigInt(10),
    });
  }

  function addressPayload(overrides: Record<string, unknown> = {}) {
    return {
      label: 'Home',
      street: 'Main Street',
      number: '10',
      city: 'Sao Paulo',
      state: 'SP',
      cep: '01001000',
      lat: -23.55,
      lng: -46.63,
      ...overrides,
    } as never;
  }
});
