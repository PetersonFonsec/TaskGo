import request from 'supertest';
import { Test } from '@nestjs/testing';
import { Body, Controller, Get, INestApplication, Query } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { UserType } from '@prisma/client';

import { AuthGuard } from './auth.guard';
import { AuthTokenService } from './auth-token.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Public } from '../../shared/decorators/public.decorator';
import { ProviderOnly } from '../../shared/decorators/roles.decorator';
import { User } from '../../shared/decorators/user.decorator';
import { RolesGuard } from '../../shared/guards/roles/roles.guard';
import type { AuthenticatedIdentity } from '../../shared/auth/authenticated-identity';

@Controller()
class AuthBoundaryController {
  @Public()
  @Get('public')
  publicRoute() {
    return { status: 'public' };
  }

  @Get('private')
  privateRoute(@User() identity: AuthenticatedIdentity) {
    return { status: 'private', identity };
  }

  @ProviderOnly()
  @Get('provider/me')
  providerMe(
    @User() identity: AuthenticatedIdentity,
    @Body() _body: unknown,
    @Query() _query: unknown,
  ) {
    return { identity };
  }
}

describe('authenticated identity and role pipeline', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const authTokenServiceMock = {
      checkToken: jest.fn((token: string) => {
        if (token === 'PROVIDER_TOKEN') return { id: '42' };
        if (token === 'CUSTOMER_TOKEN') return { id: '43' };
        throw new Error('unexpected token');
      }),
    };
    const prismaMock = {
      user: {
        findUnique: jest.fn(({ where }: { where: { id: bigint } }) => {
          if (where.id === BigInt(42)) {
            return {
              id: BigInt(42),
              type: UserType.PRESTADOR,
            };
          }
          if (where.id === BigInt(43)) {
            return {
              id: BigInt(43),
              type: UserType.CLIENTE,
            };
          }
          return null;
        }),
      },
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [AuthBoundaryController],
      providers: [
        { provide: AuthTokenService, useValue: authTokenServiceMock },
        { provide: PrismaService, useValue: prismaMock },
        { provide: APP_GUARD, useClass: AuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('allows anonymous access to public routes', async () => {
    await request(app.getHttpServer())
      .get('/public')
      .expect(200)
      .expect({ status: 'public' });
  });

  it.each([
    ['PROVIDER_TOKEN', 'PRESTADOR', '42'],
    ['CUSTOMER_TOKEN', 'CLIENTE', '43'],
  ])(
    'preserves role-neutral authentication for %s',
    async (token, role, id) => {
      await request(app.getHttpServer())
        .get('/private')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect({
          status: 'private',
          identity: { id, role },
        });
    },
  );

  it('allows a verified provider through /provider/me', async () => {
    await request(app.getHttpServer())
      .get('/provider/me')
      .set('Authorization', 'Bearer PROVIDER_TOKEN')
      .expect(200)
      .expect({
        identity: { id: '42', role: 'PRESTADOR' },
      });
  });

  it('rejects an authenticated customer from /provider/me', async () => {
    await request(app.getHttpServer())
      .get('/provider/me')
      .set('Authorization', 'Bearer CUSTOMER_TOKEN')
      .expect(403);
  });

  it('rejects anonymous access before provider-role evaluation', async () => {
    await request(app.getHttpServer()).get('/provider/me').expect(401);
  });

  it('ignores body, query, and headers attempting to impersonate another user', async () => {
    await request(app.getHttpServer())
      .get('/provider/me?userId=999&role=CLIENTE')
      .set('Authorization', 'Bearer PROVIDER_TOKEN')
      .set('x-user-id', '999')
      .set('x-user-role', 'CLIENTE')
      .send({ id: '999', userId: '999', role: 'CLIENTE' })
      .expect(200)
      .expect({
        identity: { id: '42', role: 'PRESTADOR' },
      });
  });
});
