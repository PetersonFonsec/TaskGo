import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import { AuthTokenService } from './auth-token.service';

describe('AuthTokenService', () => {
  let authTokenService: AuthTokenService;
  let jwtServiceMock;

  afterEach(() => {
    jest.clearAllMocks();
  });

  beforeEach(async () => {
    jwtServiceMock = {
      sign: jest.fn(() => 'TOKEN'),
      verify: jest.fn(),
      decode: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthTokenService,
        { provide: JwtService, useValue: jwtServiceMock },
        {
          provide: ConfigService,
          useValue: { getOrThrow: jest.fn().mockReturnValue('1d') },
        },
      ],
    }).compile();

    authTokenService = module.get(AuthTokenService);
  });

  describe('#createToken', () => {
    it('signs a token for the provided user id', async () => {
      await expect(authTokenService.createToken(BigInt(1))).resolves.toEqual({
        access_token: 'TOKEN',
      });
      expect(jwtServiceMock.sign).toHaveBeenCalledWith(
        { id: '1', tokenKind: 'customer' },
        expect.objectContaining({ subject: '1' }),
      );
    });
  });
});

describe('token purpose separation with signed tokens', () => {
  const jwt = new JwtService({ secret: 'unit-test-secret' });
  const service = new AuthTokenService(jwt, { getOrThrow: () => '1h' } as any);
  it.each([
    { sub: '1', tokenKind: 'admin', role: 'ADMINISTRATOR' },
    { id: '1' },
  ])('rejects non-customer token %j', (payload) => {
    expect(() => service.checkToken(jwt.sign(payload))).toThrow();
  });
  it('accepts a customer token it issued', async () => {
    const token = await service.createToken(1n);
    expect(service.checkToken(token.access_token)).toMatchObject({
      id: '1',
      tokenKind: 'customer',
    });
  });
});
