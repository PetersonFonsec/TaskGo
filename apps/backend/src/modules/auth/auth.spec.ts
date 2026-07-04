import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';

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
        { id: '1' },
        expect.objectContaining({ subject: '1' }),
      );
    });
  });
});
