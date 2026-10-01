import { BadRequestException, ConflictException } from '@nestjs/common';

import { PagarmeGatewayException } from '../../pagarme.service';
import { UpdateProviderPayoutCommand } from './update-provider-payout.command';
import { UpdateProviderPayoutHandler } from './update-provider-payout.handler';

describe('UpdateProviderPayoutHandler', () => {
  const cpf = '52998224725';
  const payload: any = {
    holderName: 'Maria Prestadora',
    holderType: 'INDIVIDUAL',
    holderDocument: cpf,
    bankCode: '341',
    branchNumber: '1234',
    branchCheckDigit: null,
    accountNumber: '9876543',
    accountCheckDigit: 'X',
    accountType: 'CHECKING',
  };
  let profile: any;
  let prisma: any;
  let gateway: any;
  let handler: UpdateProviderPayoutHandler;

  beforeEach(() => {
    profile = null;
    prisma = {
      provider: {
        findUnique: jest.fn(async () => ({
          id: 7n,
          user: {
            name: 'Maria Prestadora',
            email: 'maria@example.com',
            cpf,
            phone: '+5511999998888',
          },
        })),
      },
      providerPayoutProfile: {
        upsert: jest.fn(async ({ create }) => {
          profile ??= {
            pagarmeRecipientId: null,
            syncStatus: 'UNKNOWN',
            bankAccountStatus: 'UNCONFIRMED',
            bankName: null,
            bankCode: null,
            branchLastDigits: null,
            accountLastDigits: null,
            lastSynchronizedAt: null,
            lastErrorCode: null,
            updatedAt: new Date(),
            ...create,
          };
          return { ...profile };
        }),
        updateMany: jest.fn(async ({ data }) => {
          if (profile.lastErrorCode === 'SYNCING') return { count: 0 };
          Object.assign(profile, data);
          return { count: 1 };
        }),
        update: jest.fn(async ({ data }) =>
          Object.assign(profile, data, { updatedAt: new Date() }),
        ),
      },
    };
    gateway = {
      createRecipient: jest.fn(async () => ({
        recipientId: 're_new',
        status: 'active',
        bankStatus: 'active',
      })),
      updateRecipientBankAccount: jest.fn(async (recipientId: string) => ({
        recipientId,
        status: 'active',
        bankStatus: 'pending',
      })),
    };
    handler = new UpdateProviderPayoutHandler(prisma, gateway);
  });

  it('creates the recipient for the session provider and stores only masked data', async () => {
    const response = await handler.execute(
      new UpdateProviderPayoutCommand(7n, payload),
    );

    expect(prisma.provider.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 7n } }),
    );
    const input = gateway.createRecipient.mock.calls[0][0];
    expect(input).toEqual(
      expect.objectContaining({
        code: 'taskgo-provider-7',
        document: cpf,
        type: 'individual',
        email: 'maria@example.com',
        phone: { ddd: '11', number: '999998888' },
      }),
    );
    expect(input.bankAccount).toEqual(
      expect.objectContaining({
        bank: '341',
        accountNumber: '9876543',
        accountCheckDigit: 'x',
        type: 'checking',
      }),
    );
    expect(input.idempotencyKey).toMatch(/^payout-7-[0-9a-f]{32}$/);
    expect(profile).toEqual(
      expect.objectContaining({
        pagarmeRecipientId: 're_new',
        syncStatus: 'READY',
        bankAccountStatus: 'CONFIRMED',
        bankCode: '341',
        branchLastDigits: '34',
        accountLastDigits: '6543',
        lastErrorCode: null,
      }),
    );
    expect(response).toEqual(
      expect.objectContaining({
        syncStatus: 'READY',
        payoutReady: true,
        errorCode: null,
        bankAccount: {
          bankName: null,
          bankCode: '341',
          branchLastDigits: '34',
          accountLastDigits: '6543',
        },
      }),
    );
    const serialized = JSON.stringify(response);
    expect(serialized).not.toContain('9876543');
    expect(serialized).not.toContain(cpf);
  });

  it('updates the default bank account of an existing recipient', async () => {
    profile = {
      pagarmeRecipientId: 're_old',
      syncStatus: 'READY',
      bankAccountStatus: 'CONFIRMED',
      lastErrorCode: null,
      updatedAt: new Date(),
    };

    const response = await handler.execute(
      new UpdateProviderPayoutCommand(7n, payload),
    );

    expect(gateway.createRecipient).not.toHaveBeenCalled();
    expect(gateway.updateRecipientBankAccount).toHaveBeenCalledWith(
      're_old',
      expect.objectContaining({ bank: '341' }),
      expect.stringMatching(/^payout-7-/),
    );
    expect(response).toEqual(
      expect.objectContaining({ syncStatus: 'PENDING', payoutReady: false }),
    );
    expect(profile.bankAccountStatus).toBe('PROCESSING');
  });

  it('records a readable error code instead of failing when the gateway rejects a first setup', async () => {
    gateway.createRecipient.mockRejectedValue(
      new PagarmeGatewayException('falha', 'VALIDATION'),
    );

    const response = await handler.execute(
      new UpdateProviderPayoutCommand(7n, payload),
    );

    expect(response).toEqual(
      expect.objectContaining({
        syncStatus: 'NOT_CONFIGURED',
        payoutReady: false,
        errorCode: 'VALIDATION',
      }),
    );
    expect(profile.bankAccountStatus).toBe('ERROR');
    expect(profile.pagarmeRecipientId).toBeNull();
  });

  it('keeps an existing ready recipient receiving when an update fails', async () => {
    profile = {
      pagarmeRecipientId: 're_old',
      syncStatus: 'READY',
      bankAccountStatus: 'CONFIRMED',
      bankCode: '001',
      accountLastDigits: '1111',
      lastErrorCode: null,
      updatedAt: new Date(),
    };
    gateway.updateRecipientBankAccount.mockRejectedValue(new Error('boom'));

    const response = await handler.execute(
      new UpdateProviderPayoutCommand(7n, payload),
    );

    expect(response).toEqual(
      expect.objectContaining({
        syncStatus: 'READY',
        payoutReady: true,
        errorCode: 'UNKNOWN',
        bankAccount: expect.objectContaining({
          bankCode: '001',
          accountLastDigits: '1111',
        }),
      }),
    );
  });

  it('marks a recipient refused by the gateway as rejected', async () => {
    gateway.createRecipient.mockResolvedValue({
      recipientId: 're_new',
      status: 'refused',
      bankStatus: null,
    });

    const response = await handler.execute(
      new UpdateProviderPayoutCommand(7n, payload),
    );

    expect(response).toEqual(
      expect.objectContaining({
        syncStatus: 'REJECTED',
        errorCode: 'REJECTED',
      }),
    );
    expect(profile.bankAccountStatus).toBe('ERROR');
  });

  it('rejects an individual account under another CPF before calling the gateway', async () => {
    await expect(
      handler.execute(
        new UpdateProviderPayoutCommand(7n, {
          ...payload,
          holderDocument: '11144477735',
        }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(gateway.createRecipient).not.toHaveBeenCalled();
  });

  it('rejects an invalid CNPJ for company accounts', async () => {
    await expect(
      handler.execute(
        new UpdateProviderPayoutCommand(7n, {
          ...payload,
          holderType: 'COMPANY',
          holderDocument: '11222333000199',
        }),
      ),
    ).rejects.toThrow('CNPJ do titular inválido');
  });

  it('accepts a valid company CNPJ different from the provider CPF', async () => {
    await handler.execute(
      new UpdateProviderPayoutCommand(7n, {
        ...payload,
        holderType: 'COMPANY',
        holderDocument: '11222333000181',
      }),
    );

    expect(gateway.createRecipient).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'company', document: '11222333000181' }),
    );
  });

  it('refuses a concurrent synchronization for the same provider', async () => {
    profile = {
      pagarmeRecipientId: null,
      syncStatus: 'UNKNOWN',
      bankAccountStatus: 'UNCONFIRMED',
      lastErrorCode: 'SYNCING',
      updatedAt: new Date(),
    };

    await expect(
      handler.execute(new UpdateProviderPayoutCommand(7n, payload)),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(gateway.createRecipient).not.toHaveBeenCalled();
  });
});
