import request = require('supertest');
import { Test } from '@nestjs/testing';
import { INestApplication, Controller, Get } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { AuthGuard } from './auth.guard';
import { AuthTokenService } from './auth-token.service';
import { Public } from '../../shared/decorators/public.decorator';
import { User } from '../../shared/decorators/user.decorator';

@Controller()
class PublicPrivateController {
  @Public()
  @Get('public')
  publicRoute() {
    return { status: 'public' };
  }

  @Get('private')
  privateRoute(@User('id') id: string) {
    return { status: 'private', id };
  }
}

describe('AuthGuard integration', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const authTokenServiceMock = {
      checkToken: jest.fn(() => ({ id: '42' })),
      decodeToken: jest.fn(() => ({ id: '42' })),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [PublicPrivateController],
      providers: [
        { provide: AuthTokenService, useValue: authTokenServiceMock },
        {
          provide: APP_GUARD,
          useClass: AuthGuard,
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('allows anonymous access to @Public routes', async () => {
    await request(app.getHttpServer())
      .get('/public')
      .expect(200)
      .expect({ status: 'public' });
  });

  it('rejects anonymous requests to protected routes', async () => {
    await request(app.getHttpServer())
      .get('/private')
      .expect(401);
  });

  it('allows authenticated requests to protected routes and exposes requester identity', async () => {
    const res = await request(app.getHttpServer())
      .get('/private')
      .set('Authorization', 'Bearer VALID_TOKEN')
      .expect(200);

    expect(res.body).toEqual({ status: 'private', id: '42' });
  });
});
