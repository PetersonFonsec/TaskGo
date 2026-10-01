import { PagarmeGatewayException } from '../../pagarme.service';
import { GetProviderPayoutHandler } from './get-provider-payout.handler';
import { GetProviderPayoutQuery } from './get-provider-payout.query';

describe('GetProviderPayoutHandler', () => {
  let profile: any;
  let prisma: any;
  let gateway: any;
  let handler: GetProviderPayoutHandler;

  beforeEach(() => {
    profile = {
      providerId: 7n,
      pagarmeRecipientId: 're_1',
      syncStatus: 'PENDING',
      bankAccountStatus: 'PROCESSING',
      bankName: null,
      bankCode: '341',
      branchLastDigits: '34',
      accountLastDigits: '6543',
      lastSynchronizedAt: new Date(Date.now() - 5 * 60_000),
      lastErrorCode: null,
      updatedAt: new Date('2026-09-30T12:00:00.000Z'),
    };
    prisma = {
      providerPayoutProfile: {
        findUnique: jest.fn(async () => profile),
        update: jest.fn(async ({ data }) => ({ ...profile, ...data })),
      },
    };
    gateway = {
      getRecipient: jest.fn(async (recipientId: string) => ({
        recipientId,
        status: 'active',
        bankStatus: 'active',
      })),
    };
    handler = new GetProviderPayoutHandler(prisma, gateway);
  });

  it('reports a provider without profile as not configured', async () => {
    profile = null;

    await expect(
      handler.execute(new GetProviderPayoutQuery(7n)),
    ).resolves.toEqual({
      syncStatus: 'NOT_CONFIGURED',
      payoutReady: false,
      bankAccount: null,
      updatedAt: null,
      errorCode: null,
    });
    expect(prisma.providerPayoutProfile.findUnique).toHaveBeenCalledWith({
      where: { providerId: 7n },
    });
  });

  it('refreshes a pending recipient from the gateway', async () => {
    const response = await handler.execute(new GetProviderPayoutQuery(7n));

    expect(gateway.getRecipient).toHaveBeenCalledWith('re_1');
    expect(response).toEqual(
      expect.objectContaining({
        syncStatus: 'READY',
        payoutReady: true,
        bankAccount: expect.objectContaining({ accountLastDigits: '6543' }),
      }),
    );
  });

  it('does not query the gateway again within the refresh interval', async () => {
    profile.lastSynchronizedAt = new Date();

    const response = await handler.execute(new GetProviderPayoutQuery(7n));

    expect(gateway.getRecipient).not.toHaveBeenCalled();
    expect(response.syncStatus).toBe('PENDING');
  });

  it('does not query the gateway for a ready profile', async () => {
    profile.syncStatus = 'READY';
    profile.bankAccountStatus = 'CONFIRMED';

    await handler.execute(new GetProviderPayoutQuery(7n));

    expect(gateway.getRecipient).not.toHaveBeenCalled();
  });

  it('keeps the stored state when the refresh fails', async () => {
    gateway.getRecipient.mockRejectedValue(
      new PagarmeGatewayException('indisponível', 'TRANSIENT'),
    );

    const response = await handler.execute(new GetProviderPayoutQuery(7n));

    expect(response).toEqual(
      expect.objectContaining({ syncStatus: 'PENDING', payoutReady: false }),
    );
    expect(prisma.providerPayoutProfile.update).not.toHaveBeenCalled();
  });

  it('keeps the error of the last update attempt after a refresh', async () => {
    profile.lastErrorCode = 'VALIDATION';
    gateway.getRecipient.mockResolvedValue({
      recipientId: 're_1',
      status: 'pending',
      bankStatus: null,
    });

    const response = await handler.execute(new GetProviderPayoutQuery(7n));

    expect(response.errorCode).toBe('VALIDATION');
  });

  it('reports a stale in-flight synchronization as transient', async () => {
    profile.lastErrorCode = 'SYNCING';
    profile.updatedAt = new Date(Date.now() - 5 * 60_000);

    const response = await handler.execute(new GetProviderPayoutQuery(7n));

    expect(gateway.getRecipient).not.toHaveBeenCalled();
    expect(response.errorCode).toBe('TRANSIENT');
  });
});
