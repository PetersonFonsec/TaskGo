import request = require('supertest');
import { Test } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  ExecutionContext,
} from '@nestjs/common';
import { AuthGuard, TOKEN_KEY } from '../../auth/auth.guard';
import { AuthTokenService } from '../../auth/auth-token.service';
import { ProviderModule } from '../provider.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { PrismaService } from '../../../prisma/prisma.service';
import { BigIntInterceptor } from '../../../shared/interceptors/bigint.interceptor';
import { UserType } from '@prisma/client';

const validToken = 'VALID_TOKEN';
const authTokenServiceMock = {
  checkToken: jest.fn(() => ({ id: 1 })),
  decodeToken: jest.fn(() => ({ id: 1 })),
};
let authenticatedClientId = '1';

class AuthGuardMock {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    req[TOKEN_KEY] = { id: authenticatedClientId };
    return true;
  }
}

describe('FavoritesController (integration)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let clientId: number;
  let providerId: number;

  beforeAll(async () => {
    const moduleBuilder = Test.createTestingModule({
      imports: [ProviderModule, PrismaModule],
      providers: [
        { provide: AuthTokenService, useValue: authTokenServiceMock },
      ],
    });

    const moduleRef = await moduleBuilder
      .overrideGuard(AuthGuard)
      .useClass(AuthGuardMock)
      .overrideProvider(AuthTokenService)
      .useValue(authTokenServiceMock)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    app.useGlobalInterceptors(new BigIntInterceptor());
    await app.init();

    prismaService = app.get<PrismaService>(PrismaService);

    const clientCpf = `${Date.now()}`.slice(-11).padStart(11, '0');
    const providerCpf = `${Date.now() + 1}`.slice(-11).padStart(11, '0');
    const client = await prismaService.user.create({
      data: {
        name: 'favorites-api-client',
        email: `favorites-client-${Date.now()}@example.com`,
        passwordHash: 'test-password',
        type: UserType.CLIENTE,
        cpf: clientCpf,
      },
    });

    authenticatedClientId = client.id.toString();
    authTokenServiceMock.decodeToken = jest.fn(() => ({ id: client.id }));
    authTokenServiceMock.checkToken = jest.fn(() => true);

    const providerUser = await prismaService.user.create({
      data: {
        name: 'favorites-api-provider',
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

    clientId = client.id;
    providerId = provider.id;
  });

  afterAll(async () => {
    if (prismaService?.clientFavorite) {
      await prismaService.clientFavorite.deleteMany({ where: { clientId } });
    }
    if (prismaService?.provider) {
      await prismaService.provider.delete({ where: { id: providerId } });
    }
    if (prismaService?.user) {
      await prismaService.user.delete({ where: { id: providerId } });
      await prismaService.user.delete({ where: { id: clientId } });
    }
    if (app) {
      await app.close();
    }
  });

  it('adds, lists, and removes favorites via controller endpoints', async () => {
    await request(app.getHttpServer())
      .post('/favorites')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ providerId: Number(providerId) })
      .expect(201)
      .expect((res: any) => {
        expect(Number(res.body.clientId)).toBe(Number(clientId));
        expect(Number(res.body.providerId)).toBe(Number(providerId));
      });

    await request(app.getHttpServer())
      .get('/favorites')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200)
      .expect((res: any) => {
        expect(res.body.total).toBeGreaterThanOrEqual(1);
        expect(Number(res.body.items[0].providerId)).toBe(Number(providerId));
      });

    await request(app.getHttpServer())
      .post('/favorites')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ providerId: 0 })
      .expect(400);

    await request(app.getHttpServer())
      .delete(`/favorites/${providerId}`)
      .set('Authorization', `Bearer ${validToken}`)
      .send({ providerId: Number(providerId) })
      .expect(200);
  });

  it('filters provider listing to only favorited providers when onlyFavorites=true', async () => {
    await prismaService.clientFavorite.create({
      data: { clientId, providerId },
    });

    await prismaService.clientFavorite.deleteMany({
      where: { clientId, providerId },
    });
    await prismaService.clientFavorite.create({
      data: { clientId, providerId },
    });

    await request(app.getHttpServer())
      .get('/provider?onlyFavorites=true')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200)
      .expect((res: any) => {
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThanOrEqual(1);
        expect(Number(res.body[0].id)).toBe(Number(providerId));
      });
  });
});
