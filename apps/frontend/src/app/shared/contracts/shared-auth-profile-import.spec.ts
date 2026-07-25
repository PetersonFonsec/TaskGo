import type {
  AuthLoginRequest,
  CustomerAuthSession,
  ProviderProfileCompletionResponse,
  ProviderSocialLinksUpdateRequest,
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

  it('resolves completion and social contracts from the public barrel', () => {
    const completion: ProviderProfileCompletionResponse = {
      payoutReady: true,
      allComplete: false,
      required: { completed: 1, total: 1 },
      recommended: { completed: 1, total: 3 },
      items: [
        { id: 'BANK_ACCOUNT', status: 'COMPLETE', requiredForPayout: true },
        { id: 'PHOTO', status: 'COMPLETE', requiredForPayout: false },
        { id: 'SOCIAL_LINKS', status: 'PENDING', requiredForPayout: false },
        { id: 'ADDRESS', status: 'ERROR', requiredForPayout: false },
      ],
    };
    const socialUpdate: ProviderSocialLinksUpdateRequest = {
      whatsapp: null,
      instagram: '@provider',
      facebook: null,
      linkedin: 'provider',
    };

    expect(completion.payoutReady).toBeTrue();
    expect(socialUpdate.linkedin).toBe('provider');
  });
});
