import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AdminRole } from '@prisma/client';

import {
  ADMIN_TOKEN_KIND,
  AdminAuthTokenService,
} from './admin-auth-token.service';

describe('AdminAuthTokenService', () => {
  let service: AdminAuthTokenService;
  let jwtService: { sign: jest.Mock; verify: jest.Mock };

  beforeEach(() => {
    jwtService = {
      sign: jest.fn().mockReturnValue('SIGNED_ADMIN_TOKEN'),
      verify: jest.fn(),
    };
    service = new AdminAuthTokenService(jwtService as unknown as JwtService);
  });

  it('signs administrative tokens with required claims', () => {
    expect(
      service.createToken({
        id: BigInt(42),
        role: AdminRole.ADMINISTRATOR,
        tokenVersion: 3,
      }),
    ).toEqual({ access_token: 'SIGNED_ADMIN_TOKEN' });

    expect(jwtService.sign).toHaveBeenCalledWith(
      {
        sub: '42',
        tokenKind: ADMIN_TOKEN_KIND,
        role: AdminRole.ADMINISTRATOR,
        ver: 3,
      },
      { expiresIn: process.env.EXPIRES_IN },
    );
  });

  it('rejects non-admin token payloads', () => {
    jwtService.verify.mockReturnValue({ id: '42' });

    expect(() => service.verify('MARKETPLACE_TOKEN')).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects tokens with invalid administrative roles', () => {
    jwtService.verify.mockReturnValue({
      sub: '42',
      tokenKind: ADMIN_TOKEN_KIND,
      role: 'OWNER',
      ver: 3,
    });

    expect(() => service.verify('MALFORMED_ADMIN_TOKEN')).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects expired tokens reported by JwtService', () => {
    jwtService.verify.mockImplementation(() => {
      throw new Error('jwt expired');
    });

    expect(() => service.verify('EXPIRED_ADMIN_TOKEN')).toThrow(
      UnauthorizedException,
    );
  });
});
