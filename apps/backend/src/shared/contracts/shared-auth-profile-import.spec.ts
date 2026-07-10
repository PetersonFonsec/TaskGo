import type { AuthLoginRequest, CustomerAuthSession } from '@taskgo/shared';

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
});
