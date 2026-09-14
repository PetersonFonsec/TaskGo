import {
  ServiceManagementService,
  validateAvailability,
} from './service-management.service';

const availability = {
  timezone: 'America/Sao_Paulo',
  weekdays: { monday: [{ start: '09:00', end: '12:00', slotMinutes: 60 }] },
};

describe('Service availability validation', () => {
  it('accepts valid weekly windows', () =>
    expect(() => validateAvailability(availability)).not.toThrow());
  it.each([
    null,
    { ...availability, timezone: 'UTC' },
    { ...availability, weekdays: {} },
    {
      ...availability,
      weekdays: { monday: [{ start: '25:00', end: '26:00', slotMinutes: 60 }] },
    },
    {
      ...availability,
      weekdays: {
        monday: [{ start: '09:00', end: '10:00', slotMinutes: 120 }],
      },
    },
    {
      ...availability,
      weekdays: {
        monday: [
          { start: '09:00', end: '11:00', slotMinutes: 60 },
          { start: '10:00', end: '12:00', slotMinutes: 60 },
        ],
      },
    },
  ])('rejects invalid or overlapping windows: %j', (value) =>
    expect(() => validateAvailability(value)).toThrow(),
  );
});

describe('ServiceManagementService', () => {
  const draft = {
    title: 'Instalação',
    category: 'eletrica',
    basePrice: 120,
    status: 'INATIVO' as const,
  };
  function setup() {
    const prisma = {
      provider: {
        findUnique: jest.fn().mockResolvedValue({ status: 'PENDING' }),
      },
      category: { findFirst: jest.fn().mockResolvedValue({ id: 1n }) },
      service: {
        create: jest.fn().mockResolvedValue({ id: 5n }),
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    return { prisma, service: new ServiceManagementService(prisma as never) };
  }
  it('creates drafts under the authenticated provider', async () => {
    const { service, prisma } = setup();
    await service.create(42n, draft);
    expect(prisma.service.create).toHaveBeenCalledWith({
      data: { ...draft, providerId: 42n, availability: undefined },
    });
  });
  it('requires availability before activation', async () => {
    const { service, prisma } = setup();
    await expect(
      service.create(42n, { ...draft, status: 'ATIVO' }),
    ).rejects.toThrow('disponibilidade');
    expect(prisma.service.create).not.toHaveBeenCalled();
  });
  it('blocks writes by a blocked provider', async () => {
    const { service, prisma } = setup();
    prisma.provider.findUnique.mockResolvedValue({ status: 'BLOCKED' });
    await expect(service.create(42n, draft)).rejects.toThrow('indisponível');
    expect(prisma.service.create).not.toHaveBeenCalled();
  });
  it('cannot edit a service owned by another provider', async () => {
    const { service, prisma } = setup();
    prisma.service.findFirst.mockResolvedValue(null);
    await expect(
      service.update(5n, 42n, { title: 'Alteração' }),
    ).rejects.toThrow('não encontrado');
    expect(prisma.service.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 5n, providerId: 42n }),
      }),
    );
    expect(prisma.service.update).not.toHaveBeenCalled();
  });
  it('deactivates only an owned service and never deletes history', async () => {
    const { service, prisma } = setup();
    await expect(service.remove(5n, 42n)).rejects.toThrow('não encontrado');
    expect(prisma.service.updateMany).toHaveBeenCalledWith({
      where: { id: 5n, providerId: 42n },
      data: { status: 'INATIVO' },
    });
  });
});
