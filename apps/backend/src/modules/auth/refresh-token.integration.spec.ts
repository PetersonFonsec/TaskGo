import { UnauthorizedException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';

import { PrismaService } from '../../prisma/prisma.service';
import { PushService } from '../push/push.service';
import { PushTransport } from '../push/push-transport';
import {
  REFRESH_REUSE_GRACE_MS,
  RefreshTokenService,
} from './refresh-token.service';

const databaseUrl = process.env.PROXI_TEST_DATABASE_URL;
const integration = databaseUrl ? describe : describe.skip;

/**
 * Atomicidade, bloqueio e corrida da rotação, e o vínculo entre sessão e
 * aparelhos, num PostgreSQL real. Cada "instância" usa seu próprio
 * PrismaClient, como réplicas diferentes da API.
 */
integration('Refresh tokens e aparelhos no PostgreSQL', () => {
  const clients: PrismaClient[] = [];
  const config = { get: () => 60 };
  let instanceA: RefreshTokenService;
  let instanceB: RefreshTokenService;
  let db: PrismaClient;
  let userA: bigint;
  let userB: bigint;

  const connect = () => {
    const client = new PrismaClient({
      datasources: { db: { url: databaseUrl! } },
    });
    clients.push(client);
    return client;
  };
  const serviceOn = (client: PrismaClient) =>
    new RefreshTokenService(
      client as unknown as PrismaService,
      config as never,
    );
  const familyRows = (familyId: string) =>
    db.refreshToken.findMany({
      where: { familyId },
      orderBy: { id: 'asc' },
    });
  const createUser = async (label: string) => {
    const suffix = randomUUID();
    const user = await db.user.create({
      data: {
        name: `Refresh ${label}`,
        email: `${suffix}@example.invalid`,
        cpf: suffix,
        passwordHash: 'test-only',
        type: 'CLIENTE',
      },
    });
    return user.id;
  };

  beforeAll(async () => {
    const url = new URL(databaseUrl!);
    if (
      !['127.0.0.1', 'localhost'].includes(url.hostname) ||
      !['/proxi_verify', '/taskgo_abacatepay_verify'].includes(url.pathname)
    )
      throw new Error(
        'Integration tests require the explicit isolated proxi_verify database',
      );
    db = connect();
    instanceA = serviceOn(db);
    instanceB = serviceOn(connect());
    userA = await createUser('A');
    userB = await createUser('B');
  });

  afterAll(async () => {
    await db.user.deleteMany({ where: { id: { in: [userA, userB] } } });
    await Promise.all(clients.map((client) => client.$disconnect()));
  });

  describe('rotação atômica', () => {
    it('consome o token antigo e grava o sucessor na mesma família, só com hash', async () => {
      const { refresh_token, familyId } = await instanceA.issue(userA);

      const rotated = await instanceA.rotate(refresh_token);

      const rows = await familyRows(familyId);
      expect(rows).toHaveLength(2);
      expect(rows[0].usedAt).not.toBeNull();
      expect(rows[1].usedAt).toBeNull();
      expect(rotated.familyId).toBe(familyId);
      const stored = rows.map((row) => row.tokenHash);
      expect(stored).not.toContain(refresh_token);
      expect(stored).not.toContain(rotated.refresh_token);
      const ttl = rows[1].expiresAt.getTime() - rows[1].createdAt.getTime();
      expect(Math.abs(ttl - 60 * 86_400_000)).toBeLessThan(60_000);
    });

    it('desfaz o consumo quando a gravação do sucessor falha', async () => {
      const { refresh_token, familyId } = await instanceA.issue(userA);
      const issue = jest
        .spyOn(instanceA, 'issue')
        .mockRejectedValueOnce(new Error('falha simulada ao gravar'));

      await expect(instanceA.rotate(refresh_token)).rejects.toThrow(
        'falha simulada ao gravar',
      );
      issue.mockRestore();

      const rows = await familyRows(familyId);
      expect(rows).toHaveLength(1);
      expect(rows[0].usedAt).toBeNull();
      // O mesmo token continua utilizável depois do rollback.
      await expect(instanceA.rotate(refresh_token)).resolves.toEqual(
        expect.objectContaining({ familyId }),
      );
    });
  });

  describe('concorrência entre instâncias', () => {
    it('só uma renovação simultânea vence e a sessão vencedora continua válida', async () => {
      const { refresh_token, familyId } = await instanceA.issue(userA);

      const results = await Promise.allSettled([
        instanceA.rotate(refresh_token),
        instanceB.rotate(refresh_token),
        instanceA.rotate(refresh_token),
      ]);

      const won = results.filter((r) => r.status === 'fulfilled');
      const lost = results.filter((r) => r.status === 'rejected');
      expect(won).toHaveLength(1);
      expect(lost).toHaveLength(2);
      lost.forEach((r) =>
        expect((r as PromiseRejectedResult).reason).toBeInstanceOf(
          UnauthorizedException,
        ),
      );
      const rows = await familyRows(familyId);
      expect(rows).toHaveLength(2);
      expect(rows.every((row) => row.revokedAt === null)).toBe(true);

      const winner = (
        won[0] as PromiseFulfilledResult<{ refresh_token: string }>
      ).value;
      await expect(instanceB.rotate(winner.refresh_token)).resolves.toEqual(
        expect.objectContaining({ familyId }),
      );
    });

    it('reuso fora da janela revoga a família, inclusive em outra instância e após reiniciar', async () => {
      const { refresh_token, familyId } = await instanceA.issue(userA);
      const next = await instanceA.rotate(refresh_token);
      await db.refreshToken.updateMany({
        where: { familyId, usedAt: { not: null } },
        data: {
          usedAt: new Date(Date.now() - REFRESH_REUSE_GRACE_MS - 60_000),
        },
      });

      await expect(instanceB.rotate(refresh_token)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      const rows = await familyRows(familyId);
      expect(rows.every((row) => row.revokedAt !== null)).toBe(true);

      // Uma instância nova (reinício da API) enxerga a revogação no banco.
      const restarted = serviceOn(connect());
      await expect(restarted.rotate(next.refresh_token)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      await expect(restarted.rotate(refresh_token)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(await familyRows(familyId)).toHaveLength(2);
    });

    it('não renova token revogado nem expirado', async () => {
      const revoked = await instanceA.issue(userA);
      await instanceA.revoke(revoked.refresh_token);
      await expect(
        instanceA.rotate(revoked.refresh_token),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      const expired = await instanceA.issue(userA);
      await db.refreshToken.updateMany({
        where: { familyId: expired.familyId },
        data: { expiresAt: new Date(Date.now() - 1_000) },
      });
      await expect(
        instanceA.rotate(expired.refresh_token),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(await familyRows(expired.familyId)).toHaveLength(1);
    });
  });

  describe('logout e aparelhos', () => {
    let transport: { send: jest.Mock };
    let push: PushService;
    const token = (label: string) => `fcm-${label}-${randomUUID()}`;
    const sentTo = () =>
      transport.send.mock.calls.flatMap(([tokens]) => tokens as string[]);

    beforeEach(() => {
      transport = { send: jest.fn().mockResolvedValue({ invalidTokens: [] }) };
      push = new PushService(
        db as unknown as PrismaService,
        transport as unknown as PushTransport,
      );
    });

    it('o logout solta só os aparelhos da sessão encerrada', async () => {
      const phone = await instanceA.issue(userA);
      const tablet = await instanceA.issue(userA);
      const phoneToken = token('phone');
      const tabletToken = token('tablet');
      await push.registerDevice(userA, phoneToken, 'ANDROID', phone.familyId);
      await push.registerDevice(userA, tabletToken, 'IOS', tablet.familyId);

      await push.sendToUser(userA, { title: 't', body: 'b' });
      expect(sentTo()).toEqual(
        expect.arrayContaining([phoneToken, tabletToken]),
      );

      await instanceA.revoke(phone.refresh_token);
      transport.send.mockClear();
      await push.sendToUser(userA, { title: 't', body: 'b' });

      expect(sentTo()).toContain(tabletToken);
      expect(sentTo()).not.toContain(phoneToken);
      // Logout repetido não falha nem afeta a outra sessão.
      await expect(
        instanceA.revoke(phone.refresh_token),
      ).resolves.toBeUndefined();
      await expect(
        instanceA.rotate(tablet.refresh_token),
      ).resolves.toBeDefined();
    });

    it('troca de conta no mesmo aparelho não mistura destinatários', async () => {
      const sessionA = await instanceA.issue(userA);
      const sessionB = await instanceA.issue(userB);
      const shared = token('shared');
      await push.registerDevice(userA, shared, 'ANDROID', sessionA.familyId);

      await push.registerDevice(userB, shared, 'ANDROID', sessionB.familyId);

      const row = await db.deviceToken.findUnique({ where: { token: shared } });
      expect(row).toEqual(
        expect.objectContaining({
          userId: userB,
          sessionFamilyId: sessionB.familyId,
        }),
      );
      await push.sendToUser(userA, { title: 't', body: 'b' });
      expect(sentTo()).not.toContain(shared);

      // O logout tardio da conta A não derruba o aparelho agora da conta B.
      await instanceA.revoke(sessionA.refresh_token);
      expect(
        await db.deviceToken.findUnique({ where: { token: shared } }),
      ).not.toBeNull();
    });

    it('uma sessão não remove aparelho de outra sessão da mesma conta', async () => {
      const owner = await instanceA.issue(userA);
      const other = await instanceA.issue(userA);
      const device = token('owned');
      await push.registerDevice(userA, device, 'ANDROID', owner.familyId);

      await push.unregisterDevice(userA, device, other.familyId);
      await push.unregisterDevice(userB, device, null);
      expect(
        await db.deviceToken.findUnique({ where: { token: device } }),
      ).not.toBeNull();

      await push.unregisterDevice(userA, device, owner.familyId);
      expect(
        await db.deviceToken.findUnique({ where: { token: device } }),
      ).toBeNull();
    });

    it('falha no meio do logout não revoga a sessão sem soltar os aparelhos', async () => {
      const session = await instanceA.issue(userA);
      const device = token('partial');
      await push.registerDevice(userA, device, 'ANDROID', session.familyId);
      const original = (instanceA as any).endSession.bind(instanceA);
      const endSession = jest
        .spyOn(instanceA as any, 'endSession')
        .mockImplementationOnce(async (tx: any, familyId: string) => {
          await tx.refreshToken.updateMany({
            where: { familyId, revokedAt: null },
            data: { revokedAt: new Date() },
          });
          throw new Error('conexão perdida');
        });

      await expect(instanceA.revoke(session.refresh_token)).rejects.toThrow(
        'conexão perdida',
      );
      endSession.mockImplementation(original);

      const rows = await familyRows(session.familyId);
      expect(rows.every((row) => row.revokedAt === null)).toBe(true);
      expect(
        await db.deviceToken.findUnique({ where: { token: device } }),
      ).not.toBeNull();

      // Repetir o logout conclui as duas partes.
      await instanceA.revoke(session.refresh_token);
      expect(
        await db.deviceToken.findUnique({ where: { token: device } }),
      ).toBeNull();
      endSession.mockRestore();
    });
  });
  describe('registro de aparelho exige sessão ativa', () => {
    let transport: { send: jest.Mock };
    let pushA: PushService;
    let pushB: PushService;
    const token = (label: string) => `fcm-${label}-${randomUUID()}`;
    const sentTo = () =>
      transport.send.mock.calls.flatMap(([tokens]) => tokens as string[]);
    const deviceRow = (fcm: string) =>
      db.deviceToken.findUnique({ where: { token: fcm } });

    beforeEach(() => {
      transport = { send: jest.fn().mockResolvedValue({ invalidTokens: [] }) };
      pushA = new PushService(
        db as unknown as PrismaService,
        transport as unknown as PushTransport,
      );
      // Outra instância da API, com conexão própria.
      pushB = new PushService(
        connect() as unknown as PrismaService,
        transport as unknown as PushTransport,
      );
    });

    it('sessão ativa registra; revogada, expirada, de outro usuário ou inexistente não', async () => {
      const active = await instanceA.issue(userA);
      const revoked = await instanceA.issue(userA);
      await instanceA.revoke(revoked.refresh_token);
      const expired = await instanceA.issue(userA);
      await db.refreshToken.updateMany({
        where: { familyId: expired.familyId },
        data: { expiresAt: new Date(Date.now() - 1_000) },
      });
      const ofB = await instanceA.issue(userB);

      const ok = token('ok');
      await expect(
        pushA.registerDevice(userA, ok, 'ANDROID', active.familyId),
      ).resolves.toBe(true);
      expect(await deviceRow(ok)).toEqual(
        expect.objectContaining({
          userId: userA,
          sessionFamilyId: active.familyId,
        }),
      );

      for (const familyId of [
        revoked.familyId,
        expired.familyId,
        ofB.familyId,
        randomUUID(),
      ]) {
        const fcm = token('rejected');
        await expect(
          pushB.registerDevice(userA, fcm, 'ANDROID', familyId),
        ).resolves.toBe(false);
        expect(await deviceRow(fcm)).toBeNull();
      }
    });

    it('registro depois do logout é recusado e não reativa a sessão', async () => {
      const session = await instanceA.issue(userA);
      const fcm = token('late');
      await pushA.registerDevice(userA, fcm, 'IOS', session.familyId);
      await instanceA.revoke(session.refresh_token);
      expect(await deviceRow(fcm)).toBeNull();

      await expect(
        pushB.registerDevice(userA, fcm, 'IOS', session.familyId),
      ).resolves.toBe(false);
      expect(await deviceRow(fcm)).toBeNull();
      await expect(
        instanceB.rotate(session.refresh_token),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('registro e logout simultâneos em instâncias diferentes nunca deixam o aparelho vinculado', async () => {
      const outcomes = { registeredFirst: 0, rejected: 0 };
      for (let round = 0; round < 25; round++) {
        const session = await instanceA.issue(userA);
        const fcm = token(`race-${round}`);

        const [registered] = await Promise.all([
          pushB.registerDevice(userA, fcm, 'ANDROID', session.familyId),
          instanceA.revoke(session.refresh_token),
        ]);

        if (registered) outcomes.registeredFirst++;
        else outcomes.rejected++;
        expect(await deviceRow(fcm)).toBeNull();
        const rows = await familyRows(session.familyId);
        expect(rows.every((row) => row.revokedAt !== null)).toBe(true);
      }
      expect(outcomes.registeredFirst + outcomes.rejected).toBe(25);
    });

    it('rotação legítima mantém o aparelho ativo e permite registrar de novo', async () => {
      const session = await instanceA.issue(userA);
      const fcm = token('rotating');
      await pushA.registerDevice(userA, fcm, 'ANDROID', session.familyId);

      const next = await instanceB.rotate(session.refresh_token);
      await pushB.sendToUser(userA, { title: 't', body: 'b' });

      expect(sentTo()).toContain(fcm);
      await expect(
        pushB.registerDevice(userA, fcm, 'ANDROID', next.familyId),
      ).resolves.toBe(true);
    });

    it('aparelho de sessão expirada não recebe push', async () => {
      const session = await instanceA.issue(userA);
      const fcm = token('expired-session');
      await pushA.registerDevice(userA, fcm, 'ANDROID', session.familyId);
      await db.refreshToken.updateMany({
        where: { familyId: session.familyId },
        data: { expiresAt: new Date(Date.now() - 1_000) },
      });

      await pushA.sendToUser(userA, { title: 't', body: 'b' });

      expect(sentTo()).not.toContain(fcm);
    });
  });

  describe('aparelhos legados sem sessão', () => {
    let transport: { send: jest.Mock };
    let push: PushService;
    const sentTo = () =>
      transport.send.mock.calls.flatMap(([tokens]) => tokens as string[]);

    beforeEach(() => {
      transport = { send: jest.fn().mockResolvedValue({ invalidTokens: [] }) };
      push = new PushService(
        db as unknown as PrismaService,
        transport as unknown as PushTransport,
      );
    });

    it('não recebem push, são limpos no envio e voltam com um novo login', async () => {
      const legacy = `fcm-legacy-${randomUUID()}`;
      const otherSession = await instanceA.issue(userA);
      const kept = `fcm-kept-${randomUUID()}`;
      await push.registerDevice(userA, kept, 'IOS', otherSession.familyId);
      // Linha como as gravadas antes desta correção (sem sessão).
      await db.deviceToken.create({
        data: { userId: userA, token: legacy, platform: 'ANDROID' },
      });

      await push.sendToUser(userA, { title: 't', body: 'b' });

      expect(sentTo()).toContain(kept);
      expect(sentTo()).not.toContain(legacy);
      expect(
        await db.deviceToken.findUnique({ where: { token: legacy } }),
      ).toBeNull();

      const relogin = await instanceA.issue(userA);
      await expect(
        push.registerDevice(userA, legacy, 'ANDROID', relogin.familyId),
      ).resolves.toBe(true);
      expect(
        await db.deviceToken.findUnique({ where: { token: legacy } }),
      ).toEqual(expect.objectContaining({ sessionFamilyId: relogin.familyId }));

      // O logout da nova sessão não toca no aparelho da outra sessão.
      await instanceA.revoke(relogin.refresh_token);
      expect(
        await db.deviceToken.findUnique({ where: { token: kept } }),
      ).not.toBeNull();
    });

    it('a limpeza de legados de um usuário não apaga os de outro', async () => {
      const legacyB = `fcm-legacy-b-${randomUUID()}`;
      await db.deviceToken.create({
        data: { userId: userB, token: legacyB, platform: 'ANDROID' },
      });

      await push.sendToUser(userA, { title: 't', body: 'b' });

      expect(
        await db.deviceToken.findUnique({ where: { token: legacyB } }),
      ).not.toBeNull();
      await db.deviceToken.delete({ where: { token: legacyB } });
    });
  });
});
