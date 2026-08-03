import { UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';

import { AuthGuard, TOKEN_KEY } from './auth.guard';
import { AuthTokenService } from './auth-token.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UserType } from '@prisma/client';

describe('AuthGuard', () => {
  let authGuard: AuthGuard;
  let authTokenServiceMock: { checkToken: jest.Mock };
  let reflectorMock: { getAllAndOverride: jest.Mock };
  let prismaMock: { user: { findUnique: jest.Mock } };

  beforeEach(async () => {
    authTokenServiceMock = {
      checkToken: jest.fn(),
    };

    reflectorMock = {
      getAllAndOverride: jest.fn(),
    };
    prismaMock = {
      user: {
        findUnique: jest.fn(),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthGuard,
        { provide: Reflector, useValue: reflectorMock },
        { provide: AuthTokenService, useValue: authTokenServiceMock },
        { provide: PrismaService, useValue: prismaMock },
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
    reflectorMock.getAllAndOverride.mockImplementation(
      (key) => key !== 'isOptionalAuth',
    );
    const result = await authGuard.canActivate(makeContext({}));
    expect(result).toBe(true);
    expect(authTokenServiceMock.checkToken).not.toHaveBeenCalled();
  });

  it('allows an optional-auth route without a token', async () => {
    reflectorMock.getAllAndOverride.mockReturnValue(true);

    await expect(authGuard.canActivate(makeContext({}))).resolves.toBe(true);
    expect(authTokenServiceMock.checkToken).not.toHaveBeenCalled();
  });

  it('validates a token when optional authentication receives one', async () => {
    reflectorMock.getAllAndOverride.mockReturnValue(true);
    authTokenServiceMock.checkToken.mockReturnValue({ id: '1' });
    prismaMock.user.findUnique.mockResolvedValue({
      id: 1n,
      type: UserType.CLIENTE,
    });

    await expect(
      authGuard.canActivate(makeContext({ authorization: 'Bearer TOKEN' })),
    ).resolves.toBe(true);
    expect(authTokenServiceMock.checkToken).toHaveBeenCalledWith('TOKEN');
  });

  it('should accept a valid bearer token and attach the decoded payload', async () => {
    reflectorMock.getAllAndOverride.mockReturnValue(false);
    authTokenServiceMock.checkToken.mockReturnValue({ id: '1' });
    prismaMock.user.findUnique.mockResolvedValue({
      id: BigInt(1),
      type: UserType.PRESTADOR,
    });

    const request = { headers: { authorization: 'Bearer VALID_TOKEN' } } as any;
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as any;

    const result = await authGuard.canActivate(context);

    expect(result).toBe(true);
    expect(request[TOKEN_KEY]).toEqual({
      id: '1',
      role: UserType.PRESTADOR,
    });
    expect(authTokenServiceMock.checkToken).toHaveBeenCalledWith('VALID_TOKEN');
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { id: BigInt(1) },
      select: { id: true, type: true },
    });
  });

  it('should reject requests without Authorization header', async () => {
    reflectorMock.getAllAndOverride.mockReturnValue(false);
    const context = makeContext({});

    await expect(authGuard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should reject malformed Authorization headers', async () => {
    reflectorMock.getAllAndOverride.mockReturnValue(false);
    const context = makeContext({ authorization: 'MalformedHeader' });

    await expect(authGuard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should reject invalid tokens', async () => {
    reflectorMock.getAllAndOverride.mockReturnValue(false);
    authTokenServiceMock.checkToken.mockImplementation(() => {
      throw new UnauthorizedException('Invalid token');
    });

    const context = makeContext({ authorization: 'Bearer INVALID_TOKEN' });
    await expect(authGuard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it.each([
    ['missing id', {}],
    ['non-string id', { id: 42 }],
    ['invalid id', { id: 'attacker' }],
    ['zero id', { id: '0' }],
  ])('rejects a verified token with %s', async (_label, payload) => {
    reflectorMock.getAllAndOverride.mockReturnValue(false);
    authTokenServiceMock.checkToken.mockReturnValue(payload);

    await expect(
      authGuard.canActivate(
        makeContext({ authorization: 'Bearer VALID_TOKEN' }),
      ),
    ).rejects.toThrow('Invalid authentication identity');
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it.each([
    ['missing user', null],
    ['unsupported admin role', { id: BigInt(1), type: UserType.ADMIN }],
  ])('rejects %s from server-controlled state', async (_label, user) => {
    reflectorMock.getAllAndOverride.mockReturnValue(false);
    authTokenServiceMock.checkToken.mockReturnValue({ id: '1' });
    prismaMock.user.findUnique.mockResolvedValue(user);

    await expect(
      authGuard.canActivate(
        makeContext({ authorization: 'Bearer VALID_TOKEN' }),
      ),
    ).rejects.toThrow('Invalid authentication identity');
  });
});
