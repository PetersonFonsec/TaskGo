import dotenv from 'dotenv';
import { PrismaClient, UserType } from '@prisma/client';

dotenv.config();

const prisma = new PrismaClient();

describe('ClientFavorite schema and constraints', () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('creates a client favorite and enforces the unique client/provider constraint', async () => {
    const clientCpf = `${Date.now()}`.slice(-11).padStart(11, '0');
    const providerCpf = `${Date.now() + 1}`.slice(-11).padStart(11, '0');

    const client = await prisma.user.create({
      data: {
        name: 'client-favorite-test-client',
        email: `client-favorite-client-${Date.now()}@example.com`,
        passwordHash: 'test-password',
        type: UserType.CLIENTE,
        cpf: clientCpf,
      },
    });

    const providerUser = await prisma.user.create({
      data: {
        name: 'client-favorite-test-provider',
        email: `client-favorite-provider-${Date.now()}@example.com`,
        passwordHash: 'test-password',
        type: UserType.PRESTADOR,
        cpf: providerCpf,
      },
    });

    const provider = await prisma.provider.create({
      data: {
        id: providerUser.id,
      },
    });

    const favorite = await prisma.clientFavorite.create({
      data: {
        clientId: client.id,
        providerId: provider.id,
      },
    });

    await expect(
      prisma.clientFavorite.create({
        data: {
          clientId: client.id,
          providerId: provider.id,
        },
      }),
    ).rejects.toThrow();

    await prisma.clientFavorite.delete({ where: { id: favorite.id } });
    await prisma.provider.delete({ where: { id: provider.id } });
    await prisma.user.delete({ where: { id: providerUser.id } });
    await prisma.user.delete({ where: { id: client.id } });
  });
});
