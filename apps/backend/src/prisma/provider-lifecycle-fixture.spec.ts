import { ProviderStatus } from '@prisma/client';

import { providerLifecycleFixture } from '../../test/fixtures/user.factory';

describe('provider lifecycle fixtures', () => {
  it('preserves explicit lifecycle status values', () => {
    expect(
      providerLifecycleFixture({
        status: ProviderStatus.APPROVED,
        verified: true,
      }),
    ).toEqual({
      status: ProviderStatus.APPROVED,
      verified: true,
    });
  });
});
