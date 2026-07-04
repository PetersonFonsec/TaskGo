import { TestingModule, Test } from '@nestjs/testing';
import { CommandBus, QueryBus } from '@nestjs/cqrs';

import { AuthController } from './auth.controller';
import { AuthTokenService } from './auth-token.service';
import { ProviderHomeService } from './provider-home.service';

describe('Auth Controller', () => {
  let authControler: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthTokenService, useValue: { createToken: jest.fn() } },
        { provide: CommandBus, useValue: { execute: jest.fn() } },
        { provide: QueryBus, useValue: { execute: jest.fn() } },
        {
          provide: ProviderHomeService,
          useValue: { getForProvider: jest.fn() },
        },
      ],
    }).compile();

    authControler = module.get<AuthController>(AuthController);
  });

  it('Smoke test', () => {
    expect(authControler).toBeDefined();
  });
});
