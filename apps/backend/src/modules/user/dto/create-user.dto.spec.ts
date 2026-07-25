import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { CreateUserDto } from './create-user.dto';

describe('CreateUserDto social compatibility boundary', () => {
  const registration = {
    password: 'secret',
    phone: '+5511999999999',
    name: 'Provider',
    email: 'provider@example.com',
    cpf: '12345678901',
    type: 'PRESTADOR',
    address: {
      label: 'Home',
      street: 'Main Street',
      number: '10',
      city: 'Sao Paulo',
      state: 'SP',
      cep: '01001000',
      lat: -23.55,
      lng: -46.63,
    },
    services: [BigInt(1)],
  };

  it('accepts all canonical structured social fields', async () => {
    const dto = plainToInstance(CreateUserDto, {
      ...registration,
      social: {
        whatsapp: '+5511999999999',
        instagram: '@provider',
        facebook: 'provider',
        linkedin: 'provider',
      },
    });

    await expect(validate(dto)).resolves.toEqual([]);
  });

  it('accepts legacy linkdin only at registration compatibility input', async () => {
    const dto = plainToInstance(CreateUserDto, {
      ...registration,
      social: { linkdin: 'legacy-provider' },
    });

    await expect(validate(dto)).resolves.toEqual([]);
  });
});
