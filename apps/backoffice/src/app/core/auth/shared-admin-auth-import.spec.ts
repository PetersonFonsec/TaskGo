import type { AdminAuthSession, AuthLoginRequest } from '@taskgo/shared';

describe('shared admin auth contracts', () => {
  it('resolves admin auth contracts from the shared library', () => {
    const request: AuthLoginRequest = {
      email: 'admin@example.com',
      password: 'secret',
    };
    const session: AdminAuthSession = {
      access_token: 'admin-token',
      operator: {
        id: '42',
        name: 'Admin Operator',
        email: request.email,
        role: 'ADMINISTRATOR',
        active: true,
        activatedAt: null,
      },
    };

    expect(session.operator.email).toBe(request.email);
  });
});
