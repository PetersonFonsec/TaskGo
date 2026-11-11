import { TestingModule, Test } from '@nestjs/testing';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import type { PublicUserProfile } from '@taskgo/shared';

import { AuthController } from './auth.controller';
import { AuthTokenService } from './auth-token.service';
import { ProviderHomeService } from './provider-home.service';
import { RefreshTokenService } from './refresh-token.service';

describe('Auth Controller', () => {
  let authController: AuthController;
  let commandBus: { execute: jest.Mock };
  let queryBus: { execute: jest.Mock };
  let tokenService: { createToken: jest.Mock };
  let providerHomeService: { getForProvider: jest.Mock };
  let refreshTokens: {
    issue: jest.Mock;
    rotate: jest.Mock;
    revoke: jest.Mock;
  };

  const publicUser: PublicUserProfile = {
    id: '42',
    name: 'Customer User',
    email: 'customer@example.com',
    phone: '5511999999999',
    cpf: '12345678901',
    type: 'CLIENTE',
    photoUrl: null,
    bio: null,
    createdAt: '2026-07-09T12:00:00.000Z',
    updatedAt: '2026-07-09T12:00:00.000Z',
  };

  beforeEach(async () => {
    commandBus = { execute: jest.fn() };
    queryBus = { execute: jest.fn() };
    tokenService = { createToken: jest.fn() };
    providerHomeService = { getForProvider: jest.fn() };
    refreshTokens = {
      issue: jest.fn().mockResolvedValue({ refresh_token: 'REFRESH' }),
      rotate: jest.fn(),
      revoke: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthTokenService, useValue: tokenService },
        { provide: CommandBus, useValue: commandBus },
        { provide: QueryBus, useValue: queryBus },
        { provide: ProviderHomeService, useValue: providerHomeService },
        { provide: RefreshTokenService, useValue: refreshTokens },
      ],
    }).compile();

    authController = module.get<AuthController>(AuthController);
  });

  it('Smoke test', () => {
    expect(authController).toBeDefined();
  });

  it('returns a sanitized customer auth session without password fields', async () => {
    queryBus.execute.mockResolvedValue(publicUser);
    tokenService.createToken.mockResolvedValue({ access_token: 'TOKEN' });

    const result = await authController.login({
      email: 'customer@example.com',
      password: 'secret',
    });

    expect(result).toEqual({
      access_token: 'TOKEN',
      refresh_token: 'REFRESH',
      user: publicUser,
    });
    expect(result.user).not.toHaveProperty('password');
    expect(result.user).not.toHaveProperty('passwordHash');
    expect(tokenService.createToken).toHaveBeenCalledWith('42');
  });

  it('keeps providerHome outside the shared customer session contract', async () => {
    const providerUser: PublicUserProfile = {
      ...publicUser,
      type: 'PRESTADOR',
    };
    const providerHome = { nextOrders: [], revenue: { total: 0 } };
    queryBus.execute.mockResolvedValue(providerUser);
    tokenService.createToken.mockResolvedValue({ access_token: 'TOKEN' });
    providerHomeService.getForProvider.mockResolvedValue(providerHome);

    const result = await authController.login({
      email: 'provider@example.com',
      password: 'secret',
    });

    expect(result).toEqual({
      access_token: 'TOKEN',
      refresh_token: 'REFRESH',
      user: providerUser,
      providerHome,
    });
    expect(result.user).not.toHaveProperty('providerHome');
  });

  it('returns a sanitized customer session after registration', async () => {
    commandBus.execute.mockResolvedValue('42');
    queryBus.execute.mockResolvedValue(publicUser);
    tokenService.createToken.mockResolvedValue({ access_token: 'TOKEN' });

    const result = await authController.register({
      name: 'Customer User',
      email: 'customer@example.com',
      password: 'secret',
      phone: '5511999999999',
      cpf: '12345678901',
      type: 'CLIENTE',
    } as any);

    expect(result).toEqual({
      access_token: 'TOKEN',
      refresh_token: 'REFRESH',
      user: publicUser,
    });
    expect(result.user).not.toHaveProperty('orders');
    expect(result.user).not.toHaveProperty('reviews');
  });
});

describe('provider dashboard identity', () => {
  it('uses the authenticated provider id for the fresh query', async () => {
    const dashboard = {
      getForProvider: jest.fn().mockResolvedValue({ pendingRequests: [] }),
    };
    const controller = new AuthController(
      {} as any,
      {} as any,
      {} as any,
      dashboard as any,
      {} as any,
    );
    await expect(controller.providerHome('42')).resolves.toEqual({
      pendingRequests: [],
    });
    expect(dashboard.getForProvider).toHaveBeenCalledWith(42n);
  });
});

describe('refresh token rotation', () => {
  it('troca o refresh token por um novo par de tokens', async () => {
    const tokenService = {
      createToken: jest.fn().mockResolvedValue({ access_token: 'NEW_ACCESS' }),
    };
    const refreshTokens = {
      rotate: jest
        .fn()
        .mockResolvedValue({ userId: 42n, refresh_token: 'NEW_REFRESH' }),
    };
    const controller = new AuthController(
      tokenService as any,
      {} as any,
      {} as any,
      {} as any,
      refreshTokens as any,
    );

    await expect(
      controller.refresh({ refresh_token: 'OLD_REFRESH' }),
    ).resolves.toEqual({
      access_token: 'NEW_ACCESS',
      refresh_token: 'NEW_REFRESH',
    });
    expect(refreshTokens.rotate).toHaveBeenCalledWith('OLD_REFRESH');
    expect(tokenService.createToken).toHaveBeenCalledWith(42n);
  });
});
