import type {
  AuthLoginRequest,
  CustomerAuthSession,
  ProviderPayoutStatusResponse,
  ProviderProfileCompletionResponse,
} from '@taskgo/shared';

describe('shared auth/profile contracts', () => {
  it('resolves customer auth contracts from the shared library', () => {
    const request: AuthLoginRequest = {
      email: 'customer@example.com',
      password: 'secret',
    };
    const session: CustomerAuthSession = {
      access_token: 'token',
      user: {
        id: '42',
        name: 'Customer User',
        email: request.email,
        phone: '+5511999999999',
        cpf: '12345678901',
        type: 'CUSTOMER',
      },
    };

    expect(session.user.email).toBe(request.email);
  });

  it('resolves focused provider completion contracts from the public barrel', () => {
    const completion: ProviderProfileCompletionResponse = {
      payoutReady: false,
      allComplete: false,
      required: { completed: 0, total: 1 },
      recommended: { completed: 2, total: 3 },
      items: [
        { id: 'BANK_ACCOUNT', status: 'PENDING', requiredForPayout: true },
        { id: 'PHOTO', status: 'COMPLETE', requiredForPayout: false },
        { id: 'SOCIAL_LINKS', status: 'COMPLETE', requiredForPayout: false },
        { id: 'ADDRESS', status: 'PROCESSING', requiredForPayout: false },
      ],
    };
    const payout: ProviderPayoutStatusResponse = {
      syncStatus: 'PENDING',
      payoutReady: false,
      bankAccount: {
        bankName: 'Banco',
        bankCode: '001',
        branchLastDigits: '34',
        accountLastDigits: '56',
      },
      updatedAt: '2026-07-24T12:00:00.000Z',
    };

    expect(completion.items).toHaveLength(4);
    expect(payout.bankAccount?.accountLastDigits).toBe('56');
  });
});
