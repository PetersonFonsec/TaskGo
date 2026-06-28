import { Test, TestingModule } from '@nestjs/testing';
import { ProviderService } from './provider.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UserService } from '../user/user.service';
import { ServicesService } from '../services/services.service';
import { FavoritesService } from './favorites/favorites.service';

describe('ProviderService', () => {
  let service: ProviderService;
  let prisma: {
    service: { findMany: jest.Mock };
    order: { findMany: jest.Mock };
    provider: { findMany: jest.Mock; findUnique: jest.Mock };
  };
  let favoritesService: { listFavorites: jest.Mock };

  const serviceAvailability = {
    timezone: 'America/Sao_Paulo',
    weekdays: {
      monday: [{ start: '09:00', end: '11:00', slotMinutes: 60 }],
      tuesday: [{ start: '14:00', end: '16:00', slotMinutes: 60 }],
      wednesday: [{ start: '08:30', end: '10:30', slotMinutes: 60 }],
    },
  };

  const activeService = {
    id: 101n,
    availability: serviceAvailability,
  };

  const availabilityQuery = {
    from: '2026-06-22',
    to: '2026-06-24',
  };

  beforeEach(async () => {
    prisma = {
      service: {
        findMany: jest.fn().mockResolvedValue([activeService]),
      },
      order: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      provider: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
      },
    };
    favoritesService = {
      listFavorites: jest.fn().mockResolvedValue({ items: [] }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProviderService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: UserService,
          useValue: {},
        },
        {
          provide: ServicesService,
          useValue: {},
        },
        {
          provide: FavoritesService,
          useValue: favoritesService,
        },
      ],
    }).compile();

    service = module.get<ProviderService>(ProviderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('returns all providers with user and services by default', async () => {
    prisma.provider.findMany.mockResolvedValue([{ id: 1n }]);

    await expect(service.findAll()).resolves.toEqual([{ id: 1n }]);

    expect(prisma.provider.findMany).toHaveBeenCalledWith({
      include: {
        user: true,
        services: true,
      },
    });
  });

  it('returns favorite providers when onlyFavorites is enabled', async () => {
    favoritesService.listFavorites.mockResolvedValue({
      items: [{ provider: { id: 42n } }],
    });

    await expect(
      service.findAll({ onlyFavorites: true, clientId: 7 }),
    ).resolves.toEqual([{ id: 42n }]);

    expect(favoritesService.listFavorites).toHaveBeenCalledWith(7, {
      skip: 0,
      take: 100,
    });
  });

  it('requires a client id for favorite provider filtering', async () => {
    await expect(service.findAll({ onlyFavorites: true })).rejects.toThrow(
      'Authenticated client required for favorites filter',
    );
  });

  it('normalizes basePrice values when finding providers by category', async () => {
    const categoryProvider = {
      id: 42n,
      services: [{ id: 101n, basePrice: '120.50' }],
    };
    prisma.provider.findMany.mockResolvedValue([categoryProvider]);

    await expect(
      service.findProvidersByCategorySlug('limpeza'),
    ).resolves.toEqual([
      {
        id: 42n,
        services: [{ id: 101n, basePrice: 120.5 }],
      },
    ]);

    expect(prisma.provider.findMany).toHaveBeenCalledWith({
      where: {
        services: {
          some: {
            category: 'limpeza',
            status: 'ATIVO',
          },
        },
      },
      include: {
        user: true,
        locations: true,
        reviews: true,
        serviceAreas: true,
        services: {
          where: { category: 'limpeza', status: 'ATIVO' },
        },
      },
    });
  });

  it('active service availability produces expected slots for a three-day range', async () => {
    const result = await service.getAvailability('42', availabilityQuery);

    expect(prisma.service.findMany).toHaveBeenCalledWith({
      where: {
        providerId: 42n,
        status: 'ATIVO',
      },
      select: {
        id: true,
        availability: true,
      },
      orderBy: {
        id: 'asc',
      },
    });
    expect(result).toEqual({
      providerId: '42',
      timezone: 'America/Sao_Paulo',
      days: [
        {
          date: '2026-06-22',
          available: true,
          slots: [
            {
              startsAt: '2026-06-22T12:00:00.000Z',
              endsAt: '2026-06-22T13:00:00.000Z',
              serviceId: '101',
              label: '09:00',
              available: true,
            },
            {
              startsAt: '2026-06-22T13:00:00.000Z',
              endsAt: '2026-06-22T14:00:00.000Z',
              serviceId: '101',
              label: '10:00',
              available: true,
            },
          ],
        },
        {
          date: '2026-06-23',
          available: true,
          slots: [
            {
              startsAt: '2026-06-23T17:00:00.000Z',
              endsAt: '2026-06-23T18:00:00.000Z',
              serviceId: '101',
              label: '14:00',
              available: true,
            },
            {
              startsAt: '2026-06-23T18:00:00.000Z',
              endsAt: '2026-06-23T19:00:00.000Z',
              serviceId: '101',
              label: '15:00',
              available: true,
            },
          ],
        },
        {
          date: '2026-06-24',
          available: true,
          slots: [
            {
              startsAt: '2026-06-24T11:30:00.000Z',
              endsAt: '2026-06-24T12:30:00.000Z',
              serviceId: '101',
              label: '08:30',
              available: true,
            },
            {
              startsAt: '2026-06-24T12:30:00.000Z',
              endsAt: '2026-06-24T13:30:00.000Z',
              serviceId: '101',
              label: '09:30',
              available: true,
            },
          ],
        },
      ],
    });
  });

  it('existing blocking order removes the matching slot', async () => {
    prisma.order.findMany.mockResolvedValue([
      {
        serviceId: 101n,
        scheduledFor: new Date('2026-06-22T12:00:00.000Z'),
      },
    ]);

    const result = await service.getAvailability('42', availabilityQuery);

    expect(result.days[0]).toEqual({
      date: '2026-06-22',
      available: true,
      slots: [
        {
          startsAt: '2026-06-22T13:00:00.000Z',
          endsAt: '2026-06-22T14:00:00.000Z',
          serviceId: '101',
          label: '10:00',
          available: true,
        },
      ],
    });
    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: {
            in: [
              'AGUARDANDO_APROVACAO',
              'AGUARDANDO_PAGAMENTO',
              'AGENDADO',
              'EM_DESLOCAMENTO',
              'EM_ANDAMENTO',
              'AGUARDANDO_CONFIRMACAO_CLIENTE',
            ],
          },
        }),
      }),
    );
  });

  it('existing scheduled order removes the matching slot', async () => {
    prisma.order.findMany.mockResolvedValue([
      {
        serviceId: 101n,
        scheduledFor: new Date('2026-06-23T17:00:00.000Z'),
      },
    ]);

    const result = await service.getAvailability('42', availabilityQuery);

    expect(result.days[1].slots.map((slot) => slot.label)).toEqual(['15:00']);
  });

  it('existing CANCELADO order does not remove the slot', async () => {
    prisma.order.findMany.mockResolvedValue([]);

    const result = await service.getAvailability('42', availabilityQuery);

    expect(result.days[0].slots.map((slot) => slot.label)).toEqual([
      '09:00',
      '10:00',
    ]);
    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({
          status: { in: ['CANCELADO'] },
        }),
      }),
    );
  });

  it('queries only blocking order statuses and the requested date window', async () => {
    await service.getAvailability('42', availabilityQuery);

    expect(prisma.order.findMany).toHaveBeenCalledWith({
      where: {
        serviceId: {
          in: [101n],
        },
        status: {
          in: [
            'AGUARDANDO_APROVACAO',
            'AGUARDANDO_PAGAMENTO',
            'AGENDADO',
            'EM_DESLOCAMENTO',
            'EM_ANDAMENTO',
            'AGUARDANDO_CONFIRMACAO_CLIENTE',
          ],
        },
        scheduledFor: {
          gte: new Date('2026-06-22T03:00:00.000Z'),
          lt: new Date('2026-06-25T03:00:00.000Z'),
        },
      },
      select: {
        serviceId: true,
        scheduledFor: true,
      },
    });
  });

  it('malformed availability returns unavailable days without throwing', async () => {
    prisma.service.findMany.mockResolvedValue([
      {
        id: 101n,
        availability: {
          weekdays: { monday: [{ start: 'bad', end: '11:00' }] },
        },
      },
    ]);

    await expect(
      service.getAvailability('42', availabilityQuery),
    ).resolves.toEqual({
      providerId: '42',
      timezone: 'America/Sao_Paulo',
      days: [
        { date: '2026-06-22', available: false, slots: [] },
        { date: '2026-06-23', available: false, slots: [] },
        { date: '2026-06-24', available: false, slots: [] },
      ],
    });
  });

  it('returns unavailable days when the selected active service is missing', async () => {
    prisma.service.findMany.mockResolvedValue([]);

    await expect(
      service.getAvailability('42', availabilityQuery),
    ).resolves.toEqual({
      providerId: '42',
      timezone: 'America/Sao_Paulo',
      days: [
        { date: '2026-06-22', available: false, slots: [] },
        { date: '2026-06-23', available: false, slots: [] },
        { date: '2026-06-24', available: false, slots: [] },
      ],
    });
    expect(prisma.order.findMany).not.toHaveBeenCalled();
  });

  it('returns empty days for an inverted date range', async () => {
    await expect(
      service.getAvailability('42', {
        from: '2026-06-24',
        to: '2026-06-22',
      }),
    ).resolves.toEqual({
      providerId: '42',
      timezone: 'America/Sao_Paulo',
      days: [],
    });
    expect(prisma.service.findMany).not.toHaveBeenCalled();
  });

  it('uses only the requested active service when serviceId is provided', async () => {
    await service.getAvailability('42', {
      ...availabilityQuery,
      serviceId: '101',
    });

    expect(prisma.service.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          providerId: 42n,
          status: 'ATIVO',
          id: 101n,
        },
      }),
    );
  });

  it('delegates findOne to Prisma with provider profile includes', async () => {
    prisma.provider.findUnique.mockResolvedValue({ id: 42n });

    await expect(service.findOne(42)).resolves.toEqual({ id: 42n });

    expect(prisma.provider.findUnique).toHaveBeenCalledWith({
      where: {
        id: 42,
      },
      include: {
        user: true,
        locations: true,
        reviews: true,
        serviceAreas: true,
        services: true,
      },
    });
  });
});
