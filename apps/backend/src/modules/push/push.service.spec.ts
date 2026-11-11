import { PushService } from './push.service';
import { PushTransport } from './push-transport';

describe('PushService', () => {
  let prisma: {
    deviceToken: {
      upsert: jest.Mock;
      deleteMany: jest.Mock;
      findMany: jest.Mock;
    };
  };
  let transport: { send: jest.Mock };
  let service: PushService;

  beforeEach(() => {
    prisma = {
      deviceToken: {
        upsert: jest.fn().mockResolvedValue({}),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    transport = { send: jest.fn().mockResolvedValue({ invalidTokens: [] }) };
    service = new PushService(
      prisma as any,
      transport as unknown as PushTransport,
    );
  });

  it('registra o token e transfere de dono quando o aparelho troca de conta', async () => {
    await service.registerDevice(7n, 'token-abc', 'ANDROID', 'family-1');

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
    prisma.deviceToken.findMany.mockResolvedValue([
      { token: 'ok' },
      { token: 'velho' },
    ]);
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
    prisma.deviceToken.findMany.mockResolvedValue([
      { token: 'device-a' },
      { token: 'device-b' },
      { token: 'device-c' },
    ]);
    transport.send.mockResolvedValue({ invalidTokens: ['device-c'] });

    await service.sendToUser(7n, { title: 't', body: 'b' });

    expect(prisma.deviceToken.deleteMany).toHaveBeenCalledTimes(1);
    expect(prisma.deviceToken.deleteMany).toHaveBeenCalledWith({
      where: { token: { in: ['device-c'] } },
    });
  });

  it('não propaga falhas do provedor', async () => {
    prisma.deviceToken.findMany.mockResolvedValue([{ token: 'ok' }]);
    transport.send.mockRejectedValue(new Error('fcm down'));

    await expect(
      service.sendToUser(7n, { title: 't', body: 'b' }),
    ).resolves.toBeUndefined();
  });
});
