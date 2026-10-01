import { addressFixture } from './address.factory';
import { ProviderStatus } from '@prisma/client';

export const userFixture = {
  name: 'Peterson',
  email: 'peterson_customer@example.com',
  password: 'isolated-user-passphrase',
  type: 'CLIENTE',
  cpf: '12345678900',
  phone: '11999999999',
  address: { ...addressFixture },
};

export const userProviderFixture = {
  name: 'Peterson',
  email: 'peterson_provider@example.com',
  password: 'isolated-user-passphrase',
  type: 'PRESTADOR',
  cpf: '12345678900',
  phone: '11999999999',
  address: { ...addressFixture },
  subcategoryIds: [1, 2, 3],
};

export const providerLifecycleFixture = (
  overrides: Partial<{ status: ProviderStatus; verified: boolean }> = {},
) => ({
  status: ProviderStatus.PENDING,
  verified: false,
  ...overrides,
});

export const CUSTOMER_VALID = userFixture;

export const PROVIDER_VALID = userProviderFixture;
