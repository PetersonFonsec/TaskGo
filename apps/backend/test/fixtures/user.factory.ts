import { addressFixture } from "./address.factory"

export const userFixture = {
  name: 'Peterson',
  email: 'peterson_customer@example.com',
  password: 'password123',
  type: 'CLIENTE',
  cpf: '12345678900',
  phone: '11999999999',
  address: { ...addressFixture }
}

export const userProviderFixture = {
  name: 'Peterson',
  email: 'peterson_provider@example.com',
  password: 'password123',
  type: 'PRESTADOR',
  cpf: '12345678900',
  phone: '11999999999',
  address: { ...addressFixture },
  services: [1, 2, 3]
}

export const CUSTOMER_VALID = userFixture;

export const PROVIDER_VALID = userProviderFixture;
