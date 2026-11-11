import { PushService } from './push.service';
import { PushTransport } from './push-transport';

describe('PushService', () => {
  let prisma: {
    $transaction: jest.Mock;
    $queryRaw: jest.Mock;
    deviceToken: {
      upsert: jest.Mock;
      deleteMany: jest.Mock;
    };
  };
  let activeSession: unknown[];
  let deviceRows: Array<{ token: string }>;
  let transport: { send: jest.Mock };
  let service: PushService;

  beforeEach(() => {
    activeSession = [{ id: 1n }];
    deviceRows = [];
    prisma = {
      $transaction: jest.fn((run: (tx: unknown) => unknown) => run(prisma)),
      // Roteia pelo SQL: bloqueio, checagem de sessão ou aparelhos ativos.
      $queryRaw: jest.fn((sql: TemplateStringsArray) => {
        const text = sql.join('?');
        if (text.includes('pg_advisory_xact_lock')) return Promise.resolve([]);
        if (text.includes('FROM device_tokens'))
          return Promise.resolve(deviceRows);
        return Promise.resolve(activeSession);
      }),
      deviceToken: {
        upsert: jest.fn().mockResolvedValue({}),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    transport = { send: jest.fn().mockResolvedValue({ invalidTokens: [] }) };
    service = new PushService(
      prisma as any,
      transport as unknown as PushTransport,
    );
  });

  it('registra o token e transfere de dono quando o aparelho troca de conta', async () => {
    await expect(
      service.registerDevice(7n, 'token-abc', 'ANDROID', 'family-1'),
    ).resolves.toBe(true);

    expect(prisma.deviceToken.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { token: 'token-abc' },
        create: {
          userId: 7n,
          token: 'token-abc',
          platform: 'ANDROID',
          sessionFamilyId: 'family-1',
        },
        update: expect.objectContaining({
          userId: 7n,
          platform: 'ANDROID',
          sessionFamilyId: 'family-1',
        }),
      }),
    );
  });

  it('não registra quando a sessão não está ativa para o usuário', async () => {
    activeSession = [];

    await expect(
      service.registerDevice(7n, 'token-abc', 'ANDROID', 'family-1'),
    ).resolves.toBe(false);
    expect(prisma.deviceToken.upsert).not.toHaveBeenCalled();
  });

  it('apaga os registros legados sem sessão antes de enviar', async () => {
    await service.sendToUser(7n, { title: 't', body: 'b' });

    expect(prisma.deviceToken.deleteMany).toHaveBeenCalledWith({
      where: { userId: 7n, sessionFamilyId: null },
    });
  });

  it('remove só aparelhos do usuário na própria sessão ou sem sessão', async () => {
    await service.unregisterDevice(7n, 'token-abc', 'family-1');
    await service.unregisterDevice(7n, 'token-abc');

    expect(prisma.deviceToken.deleteMany).toHaveBeenNthCalledWith(1, {
      where: {
        userId: 7n,
        token: 'token-abc',
        OR: [{ sessionFamilyId: 'family-1' }, { sessionFamilyId: null }],
      },
    });
    expect(prisma.deviceToken.deleteMany).toHaveBeenNthCalledWith(2, {
      where: { userId: 7n, token: 'token-abc', sessionFamilyId: null },
    });
  });

  it('não chama o provedor quando o usuário não tem aparelhos', async () => {
    await service.sendToUser(7n, { title: 't', body: 'b' });

    expect(transport.send).not.toHaveBeenCalled();
  });

  it('envia para todos os aparelhos e apaga os tokens inválidos', async () => {
    deviceRows = [{ token: 'ok' }, { token: 'velho' }];
    transport.send.mockResolvedValue({ invalidTokens: ['velho'] });

    await service.sendToUser(7n, { title: 't', body: 'b' });

    expect(transport.send).toHaveBeenCalledWith(['ok', 'velho'], {
      title: 't',
      body: 'b',
    });
    expect(prisma.deviceToken.deleteMany).toHaveBeenCalledWith({
      where: { token: { in: ['velho'] } },
    });
  });

  it('apaga só os inválidos quando o lote tem sucessos e falhas temporárias', async () => {
    deviceRows = [
      { token: 'device-a' },
      { token: 'device-b' },
      { token: 'device-c' },
    ];
    transport.send.mockResolvedValue({ invalidTokens: ['device-c'] });

    await service.sendToUser(7n, { title: 't', body: 'b' });

    // 1ª chamada: limpeza dos legados sem sessão; 2ª: só o token inválido.
    expect(prisma.deviceToken.deleteMany).toHaveBeenCalledTimes(2);
    expect(prisma.deviceToken.deleteMany).toHaveBeenLastCalledWith({
      where: { token: { in: ['device-c'] } },
    });
  });

  it('não propaga falhas do provedor', async () => {
    deviceRows = [{ token: 'ok' }];
    transport.send.mockRejectedValue(new Error('fcm down'));

    await expect(
      service.sendToUser(7n, { title: 't', body: 'b' }),
    ).resolves.toBeUndefined();
  });
});
