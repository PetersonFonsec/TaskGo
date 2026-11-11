import { UnauthorizedException } from '@nestjs/common';
import { createHash } from 'node:crypto';

import { RefreshTokenService } from './refresh-token.service';

const hash = (token: string) =>
  createHash('sha256').update(token).digest('hex');

describe('RefreshTokenService', () => {
  let prisma: {
    refreshToken: {
      create: jest.Mock;
      findUnique: jest.Mock;
      updateMany: jest.Mock;
    };
  };
  let service: RefreshTokenService;

  const stored = (overrides: Record<string, unknown> = {}) => ({
    id: 1n,
    userId: 42n,
    familyId: 'family-1',
    tokenHash: hash('RAW'),
    createdAt: new Date(Date.now() - 1000),
    expiresAt: new Date(Date.now() + 86_400_000),
    usedAt: null,
    revokedAt: null,
    user: { type: 'CLIENTE', passwordChangedAt: null },
    ...overrides,
  });

  beforeEach(() => {
    prisma = {
      refreshToken: {
        create: jest.fn().mockResolvedValue({}),
        findUnique: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const config = { get: jest.fn().mockReturnValue(60) };
    service = new RefreshTokenService(prisma as any, config as any);
  });

  it('guarda só o hash do token emitido', async () => {
    const { refresh_token } = await service.issue(42n, 'family-1');

    const data = prisma.refreshToken.create.mock.calls[0][0].data;
    expect(data.tokenHash).toBe(hash(refresh_token));
    expect(data.tokenHash).not.toBe(refresh_token);
    expect(data).toEqual(
      expect.objectContaining({ userId: 42n, familyId: 'family-1' }),
    );
  });

  it('consome o token e emite outro na mesma família', async () => {
    prisma.refreshToken.findUnique.mockResolvedValue(stored());

    const result = await service.rotate('RAW');

    expect(result.userId).toBe(42n);
    expect(result.refresh_token).not.toBe('RAW');
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { id: 1n, usedAt: null, revokedAt: null },
      data: { usedAt: expect.any(Date) },
    });
    expect(prisma.refreshToken.create.mock.calls[0][0].data.familyId).toBe(
      'family-1',
    );
  });

  it('revoga a família quando um token já usado reaparece', async () => {
    prisma.refreshToken.findUnique.mockResolvedValue(
      stored({ usedAt: new Date() }),
    );

    await expect(service.rotate('RAW')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { familyId: 'family-1', revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
    expect(prisma.refreshToken.create).not.toHaveBeenCalled();
  });

  it('recusa tokens emitidos antes da troca de senha', async () => {
    prisma.refreshToken.findUnique.mockResolvedValue(
      stored({ user: { type: 'CLIENTE', passwordChangedAt: new Date() } }),
    );

    await expect(service.rotate('RAW')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('recusa tokens expirados ou desconhecidos', async () => {
    prisma.refreshToken.findUnique.mockResolvedValueOnce(
      stored({ expiresAt: new Date(Date.now() - 1) }),
    );
    await expect(service.rotate('RAW')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    prisma.refreshToken.findUnique.mockResolvedValueOnce(null);
    await expect(service.rotate('OUTRO')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('perde a corrida quando outra requisição consumiu o token antes', async () => {
    prisma.refreshToken.findUnique.mockResolvedValue(stored());
    prisma.refreshToken.updateMany.mockResolvedValueOnce({ count: 0 });

    await expect(service.rotate('RAW')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(prisma.refreshToken.create).not.toHaveBeenCalled();
  });
});
