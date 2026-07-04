import { Test, TestingModule } from '@nestjs/testing';
import { PrismaModule } from '../../../prisma/prisma.module';
import { SharedModule } from '../../../shared/shared.module';
import { PrismaService } from '../../../prisma/prisma.service';
import { UserType } from '@prisma/client';
import { FavoritesService } from './favorites.service';
import Mediator from '../../../shared/events/mediator';

describe('FavoritesService', () => {
  let service: FavoritesService;
  let prismaService: PrismaService;
  let mediator: Mediator;
  let clientUserId: number;
  let providerUserId: number;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule, SharedModule],
      providers: [FavoritesService],
    }).compile();

    service = module.get<FavoritesService>(FavoritesService);
    prismaService = module.get<PrismaService>(PrismaService);
    mediator = module.get<Mediator>(Mediator);
  });

  afterAll(async () => {
    await prismaService.$disconnect();
  });

  beforeEach(async () => {
    const clientCpf = `${Date.now()}`.slice(-11).padStart(11, '0');
    const providerCpf = `${Date.now() + 1}`.slice(-11).padStart(11, '0');

    const client = await prismaService.user.create({
      data: {
        name: 'favorites-test-client',
        email: `favorites-client-${Date.now()}@example.com`,
        passwordHash: 'test-password',
        type: UserType.CLIENTE,
        cpf: clientCpf,
      },
    });

    const providerUser = await prismaService.user.create({
      data: {
        name: 'favorites-test-provider',
        email: `favorites-provider-${Date.now()}@example.com`,
        passwordHash: 'test-password',
        type: UserType.PRESTADOR,
        cpf: providerCpf,
      },
    });

    const provider = await prismaService.provider.create({
      data: {
        id: providerUser.id,
      },
    });

    clientUserId = client.id;
    providerUserId = provider.id;
  });

  afterEach(async () => {
    await prismaService.clientFavorite.deleteMany({
      where: { clientId: clientUserId },
    });
    await prismaService.provider.delete({ where: { id: providerUserId } });
    await prismaService.user.delete({ where: { id: providerUserId } });
    await prismaService.user.delete({ where: { id: clientUserId } });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('adds a favorite and is idempotent for repeated calls', async () => {
    const first = await service.addFavorite(clientUserId, providerUserId);
    expect(first).toBeDefined();
    expect(first.clientId).toBe(clientUserId);
    expect(first.providerId).toBe(providerUserId);

    const second = await service.addFavorite(clientUserId, providerUserId);
    expect(second).toBeDefined();
    expect(second.id).toBe(first.id);
  });

  it('removes a favorite and is idempotent when called twice', async () => {
    await service.addFavorite(clientUserId, providerUserId);

    const removed = await service.removeFavorite(clientUserId, providerUserId);
    expect(removed).toBeDefined();
    expect(removed.clientId).toBe(clientUserId);
    expect(removed.providerId).toBe(providerUserId);

    const secondRemove = await service.removeFavorite(
      clientUserId,
      providerUserId,
    );
    expect(secondRemove).toBeNull();
  });

  it('lists paginated favorites for the client', async () => {
    await service.addFavorite(clientUserId, providerUserId);

    const result = await service.listFavorites(clientUserId, {
      skip: 0,
      take: 10,
    });
    expect(result).toBeDefined();
    expect(result.total).toBeGreaterThanOrEqual(1);
    expect(result.items.length).toBeGreaterThanOrEqual(1);
    expect(result.items[0].clientId).toBe(clientUserId);
    expect(result.items[0].providerId).toBe(providerUserId);
  });

  it('publishes telemetry events for add and remove', async () => {
    const publishSpy = jest.spyOn(mediator, 'publish');

    await service.addFavorite(clientUserId, providerUserId);
    expect(publishSpy).toHaveBeenCalledWith(
      'favorite.add',
      expect.objectContaining({
        clientId: clientUserId,
        providerId: providerUserId,
      }),
    );

    await service.removeFavorite(clientUserId, providerUserId);
    expect(publishSpy).toHaveBeenCalledWith(
      'favorite.remove',
      expect.objectContaining({
        clientId: clientUserId,
        providerId: providerUserId,
      }),
    );
  });

  it('publishes favorites.view telemetry when listing favorites', async () => {
    const publishSpy = jest.spyOn(mediator, 'publish');

    await service.addFavorite(clientUserId, providerUserId);
    await service.listFavorites(clientUserId);

    expect(publishSpy).toHaveBeenCalledWith(
      'favorites.view',
      expect.objectContaining({
        clientId: clientUserId,
        resultCount: expect.any(Number),
      }),
    );
  });
});
