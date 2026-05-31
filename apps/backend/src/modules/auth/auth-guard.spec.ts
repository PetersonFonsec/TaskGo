import { UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';

import { AuthGuard, TOKEN_KEY } from './auth.guard';
import { AuthTokenService } from './auth-token.service';

describe('AuthGuard', () => {
  let authGuard: AuthGuard;
  let authTokenServiceMock: { checkToken: jest.Mock; decodeToken: jest.Mock };
  let reflectorMock: { getAllAndOverride: jest.Mock };

  beforeEach(async () => {
    authTokenServiceMock = {
      checkToken: jest.fn(),
      decodeToken: jest.fn(),
    };

    reflectorMock = {
      getAllAndOverride: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthGuard,
        { provide: Reflector, useValue: reflectorMock },
        { provide: AuthTokenService, useValue: authTokenServiceMock },
      ],
    }).compile();

    authGuard = moduleRef.get<AuthGuard>(AuthGuard);
  });

  function makeContext(headers: Record<string, unknown>) {
    const request = { headers };
    return {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as any;
  }

  it('should allow public routes without authentication', async () => {
    reflectorMock.getAllAndOverride.mockReturnValue(true);
    const result = await authGuard.canActivate(makeContext({}));
    expect(result).toBe(true);
    expect(authTokenServiceMock.checkToken).not.toHaveBeenCalled();
  });

  it('should accept a valid bearer token and attach the decoded payload', async () => {
    reflectorMock.getAllAndOverride.mockReturnValue(false);
    authTokenServiceMock.checkToken.mockReturnValue({ id: '1' });
    authTokenServiceMock.decodeToken.mockReturnValue({ id: '1' });

    const request = { headers: { authorization: 'Bearer VALID_TOKEN' } } as any;
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as any;

    const result = await authGuard.canActivate(context);

    expect(result).toBe(true);
    expect(request[TOKEN_KEY]).toEqual({ id: '1' });
    expect(authTokenServiceMock.checkToken).toHaveBeenCalledWith('VALID_TOKEN');
  });

  it('should reject requests without Authorization header', () => {
    reflectorMock.getAllAndOverride.mockReturnValue(false);
    const context = makeContext({});

    expect(() => authGuard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('should reject malformed Authorization headers', () => {
    reflectorMock.getAllAndOverride.mockReturnValue(false);
    const context = makeContext({ authorization: 'MalformedHeader' });

    expect(() => authGuard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('should reject invalid tokens', () => {
    reflectorMock.getAllAndOverride.mockReturnValue(false);
    authTokenServiceMock.checkToken.mockImplementation(() => {
      throw new UnauthorizedException('Invalid token');
    });

    const context = makeContext({ authorization: 'Bearer INVALID_TOKEN' });
    expect(() => authGuard.canActivate(context)).toThrow(UnauthorizedException);
  });
});
