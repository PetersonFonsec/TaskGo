import * as request from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AdminRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { CUSTOMER_VALID, PROVIDER_VALID } from '../fixtures/user.factory';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('Auth E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

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
    jwtService = app.get(JwtService);
  });

  afterAll(async () => {
    await prisma.adminUser.deleteMany({
      where: {
        email: {
          in: ['task02.admin@example.com', 'task02.inactive@example.com'],
        },
      },
    });
    await app.close();
  });

  it('✅ should login successfully', async () => {
    const payload = {
      ...PROVIDER_VALID,
      cpf: '88183298044',
      email: 'novo_3@email.com',
    };
    await request(app.getHttpServer()).post('/user').send(payload).expect(201);

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: payload.email,
        password: payload.password,
      })
      .expect(201);

    expect(res.body).toHaveProperty('access_token');
    expect(res.body.user).toHaveProperty('id');
    const tokenPayload = jwtService.decode(res.body.access_token);
    expect(tokenPayload).toHaveProperty('id', res.body.user.id);
    expect(tokenPayload).not.toHaveProperty('tokenKind');

    await request(app.getHttpServer())
      .get('/admin/auth/me')
      .set('Authorization', `Bearer ${res.body.access_token}`)
      .expect(401);
  });

  it('✅ should return an administrative token for a valid operator', async () => {
    const passwordHash = await bcrypt.hash('admin-password-123', 10);
    await prisma.adminUser.upsert({
      where: { email: 'task02.admin@example.com' },
      update: {
        passwordHash,
        role: AdminRole.ADMINISTRATOR,
        active: true,
        tokenVersion: 3,
        activatedAt: new Date(),
        invitationTokenHash: 'INVITATION_SECRET',
        invitationExpiresAt: new Date(Date.now() + 86400000),
      },
      create: {
        name: 'Task 02 Admin',
        email: 'task02.admin@example.com',
        passwordHash,
        role: AdminRole.ADMINISTRATOR,
        active: true,
        tokenVersion: 3,
        activatedAt: new Date(),
        invitationTokenHash: 'INVITATION_SECRET',
        invitationExpiresAt: new Date(Date.now() + 86400000),
      },
    });

    const res = await request(app.getHttpServer())
      .post('/admin/auth/login')
      .send({
        email: 'task02.admin@example.com',
        password: 'admin-password-123',
      })
      .expect(201);

    expect(res.body).toHaveProperty('access_token');
    expect(res.body.operator).toEqual(
      expect.objectContaining({
        email: 'task02.admin@example.com',
        role: AdminRole.ADMINISTRATOR,
        active: true,
      }),
    );
    expect(res.body.operator).not.toHaveProperty('passwordHash');
    expect(res.body.operator).not.toHaveProperty('invitationTokenHash');
    expect(res.body.operator).not.toHaveProperty('invitationExpiresAt');

    const payload = jwtService.decode(res.body.access_token);
    expect(payload).toEqual(
      expect.objectContaining({
        sub: res.body.operator.id,
        tokenKind: 'admin',
        role: AdminRole.ADMINISTRATOR,
        ver: 3,
      }),
    );
    expect(payload).not.toHaveProperty('id');
  });

  it('✅ should return the current operator without password or invitation fields', async () => {
    const passwordHash = await bcrypt.hash('admin-password-123', 10);
    const operator = await prisma.adminUser.upsert({
      where: { email: 'task02.admin@example.com' },
      update: {
        passwordHash,
        role: AdminRole.ADMINISTRATOR,
        active: true,
        tokenVersion: 3,
        activatedAt: new Date(),
        invitationTokenHash: 'INVITATION_SECRET',
        invitationExpiresAt: new Date(Date.now() + 86400000),
      },
      create: {
        name: 'Task 02 Admin',
        email: 'task02.admin@example.com',
        passwordHash,
        role: AdminRole.ADMINISTRATOR,
        active: true,
        tokenVersion: 3,
        activatedAt: new Date(),
        invitationTokenHash: 'INVITATION_SECRET',
        invitationExpiresAt: new Date(Date.now() + 86400000),
      },
    });
    const accessToken = jwtService.sign({
      sub: operator.id.toString(),
      tokenKind: 'admin',
      role: AdminRole.ADMINISTRATOR,
      ver: operator.tokenVersion,
    });

    const res = await request(app.getHttpServer())
      .get('/admin/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.operator).toEqual(
      expect.objectContaining({
        id: operator.id.toString(),
        email: 'task02.admin@example.com',
        role: AdminRole.ADMINISTRATOR,
      }),
    );
    expect(res.body.operator).not.toHaveProperty('passwordHash');
    expect(res.body.operator).not.toHaveProperty('invitationTokenHash');
    expect(res.body.operator).not.toHaveProperty('invitationExpiresAt');
  });

  it('✅ should allow anonymous service discovery', async () => {
    await request(app.getHttpServer()).get('/services').expect(200);

    await request(app.getHttpServer()).get('/provider').expect(200);

    await request(app.getHttpServer()).get('/categories').expect(200);
  });

  it('✅ should reject anonymous order creation on a protected route', async () => {
    await request(app.getHttpServer())
      .post('/order')
      .send({
        serviceId: '1',
        paymentMethod: 'PIX',
      })
      .expect(401);
  });

  it('✅ should return an token when login successfully', async () => {
    const payload = {
      ...PROVIDER_VALID,
      cpf: '21635316006',
      email: 'novo_2@email.com',
    };
    await request(app.getHttpServer()).post('/user').send(payload).expect(201);

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: payload.email,
        password: payload.password,
      })
      .expect(201);

    expect(res.body).toHaveProperty('access_token');
  });

  it('✅ should create user type PROVIDER successfully', async () => {
    const payload = {
      ...PROVIDER_VALID,
      cpf: '19504402062',
      email: 'novo_1@email.com',
    };

    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send(payload)
      .expect(201);

    expect(res.body.user).toHaveProperty('id');
    expect(res.body).toHaveProperty('access_token');
  });

  it('✅ should return token when user is created', async () => {
    const payload = {
      ...PROVIDER_VALID,
      cpf: '89770787094',
      email: 'novo_5@email.com',
    };
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send(payload)
      .expect(201);

    expect(res.body).toHaveProperty('access_token');
  });

  it('❌ should fail when password and email is wrong', async () => {
    const payload = {
      email: 'wrong@email.com',
      password: 'wrongpassword123',
    };

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send(payload)
      .expect(403);

    expect(res.body).not.toHaveProperty('access_token');
  });
});
