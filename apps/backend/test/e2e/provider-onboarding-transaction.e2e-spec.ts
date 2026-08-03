import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';

import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('Provider onboarding transaction E2E', () => {
  const email = 'onboarding-rollback@taskgo.test';
  const cpf = '12345678909';
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        forbidNonWhitelisted: true,
        transform: true,
        whitelist: true,
      }),
    );
    await app.init();
    prisma = app.get(PrismaService);
    await cleanup();
  });

  afterAll(async () => {
    if (prisma) await cleanup();
    if (app) await app.close();
  });

  it('rolls back user and address when provider service association fails', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Rollback Provider',
        email,
        password: 'password123',
        cpf,
        phone: '11999999999',
        type: 'PRESTADOR',
        bio: 'Rollback transaction test',
        address: {
          label: 'Principal',
          street: 'Rua Transacional',
          number: '10',
          city: 'Sao Paulo',
          state: 'SP',
          cep: '01001000',
          lat: -23.5505,
          lng: -46.6333,
          isDefault: true,
        },
        services: ['9223372036854775807'],
      })
      .expect(400);

    const persistedUser = await prisma.user.findUnique({ where: { email } });
    expect(persistedUser).toBeNull();

    const persistedAddress = await prisma.address.findFirst({
      where: { user: { email } },
    });
    expect(persistedAddress).toBeNull();

    const persistedProvider = await prisma.provider.findFirst({
      where: { user: { email } },
    });
    expect(persistedProvider).toBeNull();
  });

  async function cleanup() {
    await prisma.user.deleteMany({ where: { email } });
  }
});
