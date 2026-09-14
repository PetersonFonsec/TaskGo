import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ServiceStatus } from '@prisma/client';

import { CreateServiceDto } from './create-service.dto';

describe('CreateServiceDto', () => {
  it('transforms numeric prices', async () => {
    const dto = plainToInstance(CreateServiceDto, {
      title: 'Instalação',
      category: 'eletrica',
      basePrice: '120.50',
      status: ServiceStatus.ATIVO,
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.basePrice).toBe(120.5);
  });

  it('rejects client-supplied provider ownership', async () => {
    const dto = plainToInstance(CreateServiceDto, {
      providerId: 'not-an-id',
      title: 'Instalação',
      category: 'eletrica',
      basePrice: 120,
      status: ServiceStatus.ATIVO,
    });

    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect(errors.map(({ property }) => property)).toContain('providerId');
  });
});
