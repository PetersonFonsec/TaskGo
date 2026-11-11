import { UnauthorizedException } from '@nestjs/common';
import { createHash } from 'node:crypto';

import {
  REFRESH_REUSE_GRACE_MS,
  RefreshTokenService,
} from './refresh-token.service';

const hash = (token: string) =>
  createHash('sha256').update(token).digest('hex');

/**
 * Testes de unidade da lógica de decisão. Atomicidade, bloqueio e corrida
 * com banco real estão em refresh-token.integration.spec.ts.
 */
describe('RefreshTokenService', () => {
  const now = new Date('2026-11-11T12:00:00Z');
  let tx: {
    $queryRaw: jest.Mock;
    user: { findUnique: jest.Mock };
    refreshToken: {
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
      findUnique: jest.Mock;
    };
    deviceToken: { deleteMany: jest.Mock };
  };
  let prisma: { $transaction: jest.Mock; refreshToken: { create: jest.Mock } };
  let service: RefreshTokenService;

  const locked = (overrides: Record<string, unknown> = {}) => ({
    id: 1n,
    userId: 42n,
    familyId: 'family-1',
    createdAt: new Date(now.getTime() - 60_000),
    expiresAt: new Date(now.getTime() + 86_400_000),
    usedAt: null,
    revokedAt: null,
    dbNow: now,
    ...overrides,
  });

  beforeEach(() => {
    tx = {
      $queryRaw: jest.fn().mockResolvedValue([locked()]),
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ type: 'CLIENTE', passwordChangedAt: null }),
      },
      refreshToken: {
        create: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUnique: jest.fn(),
      },
      deviceToken: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
    };
    prisma = {
      // Repassa o cliente transacional; falhas propagam como num rollback.
      $transaction: jest.fn((run: (client: typeof tx) => unknown) => run(tx)),
      refreshToken: { create: jest.fn().mockResolvedValue({}) },
    };
    const config = { get: jest.fn().mockReturnValue(60) };
    service = new RefreshTokenService(prisma as any, config as any);
  });

  it('emite um token opaco, guarda só o hash e aplica o TTL configurado', async () => {
    const before = Date.now();
    const { refresh_token, familyId } = await service.issue(42n, 'family-1');

    const data = prisma.refreshToken.create.mock.calls[0][0].data;
    expect(refresh_token).toMatch(/^[A-Za-z0-9_-]{64}$/);
    expect(familyId).toBe('family-1');
    expect(data.tokenHash).toBe(hash(refresh_token));
    expect(Object.values(data)).not.toContain(refresh_token);
    const ttl = data.expiresAt.getTime() - before;
    expect(ttl).toBeGreaterThanOrEqual(60 * 86_400_000);
    expect(ttl).toBeLessThan(60 * 86_400_000 + 5_000);
  });

  it('consome o token e grava o sucessor na mesma transação e família', async () => {
    const result = await service.rotate('RAW');

    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.refreshToken.update).toHaveBeenCalledWith({
      where: { id: 1n },
      data: { usedAt: now },
    });
    // O sucessor é gravado pelo cliente transacional, não pelo global.
    expect(prisma.refreshToken.create).not.toHaveBeenCalled();
    const data = tx.refreshToken.create.mock.calls[0][0].data;
    expect(data.familyId).toBe('family-1');
    expect(data.tokenHash).toBe(hash(result.refresh_token));
    expect(result).toEqual(
      expect.objectContaining({ userId: 42n, familyId: 'family-1' }),
    );
  });

  it('propaga a falha na criação do sucessor para desfazer o consumo', async () => {
    tx.refreshToken.create.mockRejectedValue(new Error('db down'));

    await expect(service.rotate('RAW')).rejects.toThrow('db down');
  });

  it('não cria sucessor quando o consumo falha', async () => {
    tx.refreshToken.update.mockRejectedValue(new Error('db down'));

    await expect(service.rotate('RAW')).rejects.toThrow('db down');
    expect(tx.refreshToken.create).not.toHaveBeenCalled();
  });

  it('recusa sem revogar a sessão quando a corrida cai na janela de tolerância', async () => {
    tx.$queryRaw.mockResolvedValue([
      locked({ usedAt: new Date(now.getTime() - REFRESH_REUSE_GRACE_MS) }),
    ]);

    await expect(service.rotate('RAW')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(tx.refreshToken.updateMany).not.toHaveBeenCalled();
    expect(tx.refreshToken.create).not.toHaveBeenCalled();
  });

  it('revoga a família e solta os aparelhos quando o reuso passa da janela', async () => {
    tx.$queryRaw.mockResolvedValue([
      locked({
        usedAt: new Date(now.getTime() - REFRESH_REUSE_GRACE_MS - 1),
      }),
    ]);

    await expect(service.rotate('RAW')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(tx.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { familyId: 'family-1', revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
    expect(tx.deviceToken.deleteMany).toHaveBeenCalledWith({
      where: { userId: 42n, sessionFamilyId: 'family-1' },
    });
    expect(tx.refreshToken.create).not.toHaveBeenCalled();
  });

  it('não renova token revogado, mesmo dentro da janela', async () => {
    tx.$queryRaw.mockResolvedValue([locked({ usedAt: now, revokedAt: now })]);

    await expect(service.rotate('RAW')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(tx.refreshToken.create).not.toHaveBeenCalled();
  });

  it('não renova token expirado', async () => {
    tx.$queryRaw.mockResolvedValue([
      locked({ expiresAt: new Date(now.getTime() - 1) }),
    ]);

    await expect(service.rotate('RAW')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(tx.refreshToken.create).not.toHaveBeenCalled();
  });

  it('recusa tokens emitidos antes da troca de senha', async () => {
    tx.user.findUnique.mockResolvedValue({
      type: 'CLIENTE',
      passwordChangedAt: now,
    });

    await expect(service.rotate('RAW')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(tx.refreshToken.create).not.toHaveBeenCalled();
  });

  it('recusa token desconhecido', async () => {
    tx.$queryRaw.mockResolvedValue([]);

    await expect(service.rotate('OUTRO')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('logout revoga a família e os aparelhos dela; token desconhecido é ignorado', async () => {
    tx.refreshToken.findUnique.mockResolvedValueOnce({
      familyId: 'family-1',
      userId: 42n,
    });
    await service.revoke('RAW');
    expect(tx.deviceToken.deleteMany).toHaveBeenCalledWith({
      where: { userId: 42n, sessionFamilyId: 'family-1' },
    });

    tx.refreshToken.findUnique.mockResolvedValueOnce(null);
    await expect(service.revoke('RAW')).resolves.toBeUndefined();
  });
});
