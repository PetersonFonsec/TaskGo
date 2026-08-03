import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ServiceStatus } from '@prisma/client';

import { CreateServiceDto } from './create-service.dto';

describe('CreateServiceDto', () => {
  it('accepts JSON-safe provider IDs and transforms numeric prices', async () => {
    const dto = plainToInstance(CreateServiceDto, {
      providerId: '9223372036854775807',
      title: 'Instalação',
      category: 'eletrica',
      basePrice: '120.50',
      status: ServiceStatus.ATIVO,
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.basePrice).toBe(120.5);
  });

  it('rejects UUIDs and non-numeric provider IDs', async () => {
    const dto = plainToInstance(CreateServiceDto, {
      providerId: 'not-an-id',
      title: 'Instalação',
      category: 'eletrica',
      basePrice: 120,
      status: ServiceStatus.ATIVO,
    });

    const errors = await validate(dto);
    expect(errors.map(({ property }) => property)).toContain('providerId');
  });
});
