import { TestingModule, Test } from '@nestjs/testing';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import type { PublicUserProfile } from '@taskgo/shared';

import { AuthController } from './auth.controller';
import { AuthTokenService } from './auth-token.service';
import { ProviderHomeService } from './provider-home.service';

describe('Auth Controller', () => {
  let authController: AuthController;
  let commandBus: { execute: jest.Mock };
  let queryBus: { execute: jest.Mock };
  let tokenService: { createToken: jest.Mock };
  let providerHomeService: { getForProvider: jest.Mock };

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

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthTokenService, useValue: tokenService },
        { provide: CommandBus, useValue: commandBus },
        { provide: QueryBus, useValue: queryBus },
        { provide: ProviderHomeService, useValue: providerHomeService },
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
      user: publicUser,
    });
    expect(result.user).not.toHaveProperty('password');
    expect(result.user).not.toHaveProperty('passwordHash');
    expect(tokenService.createToken).toHaveBeenCalledWith('42');
  });

  it('keeps providerHome outside the shared customer session contract', async () => {
    const providerUser: PublicUserProfile = { ...publicUser, type: 'PRESTADOR' };
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
      user: publicUser,
    });
    expect(result.user).not.toHaveProperty('orders');
    expect(result.user).not.toHaveProperty('reviews');
  });
});
