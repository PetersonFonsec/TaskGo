
import * as request from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';

import { CUSTOMER_VALID, PROVIDER_VALID } from '../fixtures/user.factory';
import { AppModule } from '../../src/app.module';

describe('Auth E2E', () => {
  let app: INestApplication;

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
  });

  afterAll(async () => {
    await app.close();
  });

  it('✅ should login successfully', async () => {
    const payload = {
      ...PROVIDER_VALID,
      cpf: '88183298044',
      email: 'novo_3@email.com'
    }
    await request(app.getHttpServer())
      .post('/user')
      .send(payload)
      .expect(201);

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: payload.email,
        password: payload.password,
      })
      .expect(201);

    expect(res.body).toHaveProperty('access_token');
    expect(res.body.user).toHaveProperty('id');
  });

  it('✅ should return an token when login successfully', async () => {
    const payload = {
      ...PROVIDER_VALID,
      cpf: '21635316006',
      email: 'novo_2@email.com'
    }
    await request(app.getHttpServer())
      .post('/user')
      .send(payload)
      .expect(201);

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
      email: 'novo_1@email.com'
    }

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
      email: 'novo_5@email.com'
    }
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
