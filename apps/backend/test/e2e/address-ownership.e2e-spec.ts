import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { UserType } from '@prisma/client';
import * as request from 'supertest';

import { AppModule } from '../../src/app.module';
import { AuthTokenService } from '../../src/modules/auth/auth-token.service';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('Authenticated address ownership E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tokens: AuthTokenService;
  let userId: bigint;
  let otherUserId: bigint;
  let userToken: string;
  const suffix = Date.now();
  const emailPrefix = `address.ownership.${suffix}`;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    prisma = app.get(PrismaService);
    tokens = app.get(AuthTokenService);

    const user = await prisma.user.create({
      data: {
        name: 'Address Owner',
        email: `${emailPrefix}.owner@example.com`,
        passwordHash: 'not-used',
        cpf: uniqueCpf(1),
        type: UserType.CLIENTE,
      },
    });
    const otherUser = await prisma.user.create({
      data: {
        name: 'Other Address Owner',
        email: `${emailPrefix}.other@example.com`,
        passwordHash: 'not-used',
        cpf: uniqueCpf(2),
        type: UserType.PRESTADOR,
      },
    });

    userId = user.id;
    otherUserId = otherUser.id;
    userToken = (await tokens.createToken(userId)).access_token;
  });

  beforeEach(async () => {
    await prisma.address.deleteMany({
      where: { userId: { in: [userId, otherUserId] } },
    });
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.address.deleteMany({
        where: { userId: { in: [userId, otherUserId] } },
      });
      await prisma.user.deleteMany({
        where: { email: { startsWith: emailPrefix } },
      });
    }
    if (app) await app.close();
  });

  it('lists only the authenticated user rows and total', async () => {
    await prisma.address.createMany({
      data: [
        { ...addressData('Owner 1'), userId },
        { ...addressData('Owner 2'), userId },
        { ...addressData('Other'), userId: otherUserId },
      ],
    });

    const response = await authenticated(userToken)
      .get('/user/me/addresses?page=1&limit=10')
      .expect(200);

    expect(response.body.meta.total).toBe(2);
    expect(response.body.data).toHaveLength(2);
    expect(
      response.body.data.every(
        (address: { userId: string }) => address.userId === userId.toString(),
      ),
    ).toBe(true);
  });

  it('rejects injected ownership during create without assigning a record', async () => {
    await authenticated(userToken)
      .post('/user/me/addresses')
      .send({ ...addressData('Injected'), userId: otherUserId.toString() })
      .expect(400);

    await expect(
      prisma.address.count({
        where: { label: 'Injected', userId: otherUserId },
      }),
    ).resolves.toBe(0);
  });

  it('denies cross-user read, update, and delete while preserving the record', async () => {
    const target = await prisma.address.create({
      data: { ...addressData('Protected'), userId: otherUserId },
    });

    await authenticated(userToken)
      .get(`/user/me/addresses/${target.id}`)
      .expect(403);
    await authenticated(userToken)
      .patch(`/user/me/addresses/${target.id}`)
      .send({ city: 'Campinas' })
      .expect(403);
    await authenticated(userToken)
      .delete(`/user/me/addresses/${target.id}`)
      .expect(403);

    await expect(
      prisma.address.findUniqueOrThrow({ where: { id: target.id } }),
    ).resolves.toEqual(
      expect.objectContaining({
        city: 'Sao Paulo',
        userId: otherUserId,
      }),
    );
  });

  it("does not clear another user's default address", async () => {
    const ownerDefault = await prisma.address.create({
      data: { ...addressData('Owner default'), userId, isDefault: true },
    });
    const ownerSecondary = await prisma.address.create({
      data: { ...addressData('Owner secondary'), userId, isDefault: false },
    });
    const otherDefault = await prisma.address.create({
      data: {
        ...addressData('Other default'),
        userId: otherUserId,
        isDefault: true,
      },
    });

    await authenticated(userToken)
      .patch(`/user/me/addresses/${ownerSecondary.id}`)
      .send({ isDefault: true })
      .expect(200);

    const [previous, selected, untouched] = await Promise.all([
      prisma.address.findUniqueOrThrow({ where: { id: ownerDefault.id } }),
      prisma.address.findUniqueOrThrow({ where: { id: ownerSecondary.id } }),
      prisma.address.findUniqueOrThrow({ where: { id: otherDefault.id } }),
    ]);
    expect(previous.isDefault).toBe(false);
    expect(selected.isDefault).toBe(true);
    expect(untouched.isDefault).toBe(true);
  });

  it.each([
    ['get', '/user/me/addresses'],
    ['post', '/user/me/addresses'],
    ['get', '/user/me/addresses/1'],
    ['patch', '/user/me/addresses/1'],
    ['delete', '/user/me/addresses/1'],
  ] as const)('rejects anonymous %s %s', async (method, path) => {
    await request(app.getHttpServer())[method](path).expect(401);
  });

  it('supports same-user create, list, read, update, and delete', async () => {
    const created = await authenticated(userToken)
      .post('/user/me/addresses')
      .send({ ...addressData('CRUD'), isDefault: true })
      .expect(201);

    const id = created.body.id;
    expect(created.body.userId).toBe(userId.toString());

    await authenticated(userToken)
      .get('/user/me/addresses')
      .expect(200)
      .expect((response) => {
        expect(response.body.meta.total).toBe(1);
      });
    await authenticated(userToken)
      .get(`/user/me/addresses/${id}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.label).toBe('CRUD');
      });
    await authenticated(userToken)
      .patch(`/user/me/addresses/${id}`)
      .send({ city: 'Campinas' })
      .expect(200)
      .expect((response) => {
        expect(response.body.city).toBe('Campinas');
      });
    await authenticated(userToken)
      .delete(`/user/me/addresses/${id}`)
      .expect(200);

    await expect(
      prisma.address.findUnique({ where: { id: BigInt(id) } }),
    ).resolves.toBeNull();
  });

  function authenticated(token: string) {
    return {
      get: (path: string) =>
        request(app.getHttpServer())
          .get(path)
          .set('Authorization', `Bearer ${token}`),
      post: (path: string) =>
        request(app.getHttpServer())
          .post(path)
          .set('Authorization', `Bearer ${token}`),
      patch: (path: string) =>
        request(app.getHttpServer())
          .patch(path)
          .set('Authorization', `Bearer ${token}`),
      delete: (path: string) =>
        request(app.getHttpServer())
          .delete(path)
          .set('Authorization', `Bearer ${token}`),
    };
  }

  function addressData(label: string) {
    return {
      label,
      street: 'Main Street',
      number: '10',
      city: 'Sao Paulo',
      state: 'SP',
      cep: '01001000',
      lat: -23.55,
      lng: -46.63,
    };
  }

  function uniqueCpf(offset: number) {
    return `${suffix}${offset}`.padStart(11, '0').slice(-11);
  }
});
