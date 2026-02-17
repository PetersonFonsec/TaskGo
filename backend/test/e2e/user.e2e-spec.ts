import * as request from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';

import { CUSTOMER_VALID, PROVIDER_VALID } from '../fixtures/user.factory';
import { AppModule } from '../../src/app.module';

describe('Users E2E', () => {
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

  it('✅ should create user type CUSTOMER successfully', async () => {
    const res = await request(app.getHttpServer())
      .post('/user')
      .send(CUSTOMER_VALID)
      .expect(201);

    expect(res.body).toHaveProperty('id');
  });

  it('✅ should create user type PROVIDER successfully', async () => {
    const  payload = {
      ...PROVIDER_VALID,
      cpf: '67878080038',
      email: 'novo_4@email.com'
    }
    const res = await request(app.getHttpServer())
      .post('/user')
      .send(payload)
      .expect(201);

    expect(res.body).toHaveProperty('id');
  });

  it('❌ should fail if email already exists', async () => {
    await request(app.getHttpServer())
      .post('/user')
      .send(CUSTOMER_VALID);

    const res = await request(app.getHttpServer())
      .post('/user')
      .send(CUSTOMER_VALID)
      .expect(400);

    expect(res.body.message).toBeDefined();
  });

  it('❌ should fail if password confirmation is different', async () => {
    const payload = {
      ...CUSTOMER_VALID,
      email: 'outro@email.com',
      confirmPassword: 'diferente123',
    };

    const res = await request(app.getHttpServer())
      .post('/user')
      .send(payload)
      .expect(400);

    expect(res.body.message).toBeDefined();
  });

  it('❌ should fail if required field is missing', async () => {
    const { email, ...payload } = CUSTOMER_VALID;

    const res = await request(app.getHttpServer())
      .post('/user')
      .send(payload)
      .expect(400);

    expect(res.body.message).toBeDefined();
  });

  it('❌ should fail if services array is empty when user is provider', async () => {
    const payload = {
      ...CUSTOMER_VALID,
      type: 'PRESTADOR',
      email: 'novo@email.com',
      services: [],
    };

    const res = await request(app.getHttpServer())
      .post('/user')
      .send(payload)
      .expect(400);

    expect(res.body.message).toBeDefined();
  });
});
