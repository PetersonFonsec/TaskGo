import { UserType } from '@prisma/client';

import { TOKEN_KEY } from '../../modules/auth/auth.guard';
import { getAuthenticatedIdentity } from './user.decorator';

describe('authenticated user decorator boundary', () => {
  it('returns only the identity established by AuthGuard', () => {
    const request = {
      [TOKEN_KEY]: { id: '42', role: UserType.PRESTADOR },
      body: { id: '99', userId: '99', role: UserType.CLIENTE },
      query: { userId: '98', role: UserType.CLIENTE },
      params: { userId: '97' },
      headers: { 'x-user-id': '96', 'x-user-role': UserType.CLIENTE },
    };

    expect(getAuthenticatedIdentity(request)).toEqual({
      id: '42',
      role: UserType.PRESTADOR,
    });
  });

  it('returns null when AuthGuard has not established identity', () => {
    expect(
      getAuthenticatedIdentity({
        body: { id: '99', role: UserType.PRESTADOR },
      } as never),
    ).toBeNull();
  });
});
