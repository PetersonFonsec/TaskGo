import { Test, TestingModule } from '@nestjs/testing';
import { ProviderService } from './provider.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('ProviderService', () => {
  let service: ProviderService;
  let prisma: {
    $transaction: jest.Mock;
    service: { findMany: jest.Mock };
    order: { findMany: jest.Mock };
    provider: { findMany: jest.Mock; findUnique: jest.Mock; create: jest.Mock };
  };

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
      $transaction: jest.fn(async (callback) => callback(prisma)),
      service: {
        findMany: jest.fn().mockResolvedValue([activeService]),
      },
      order: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      provider: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
      },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProviderService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<ProviderService>(ProviderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
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
});
