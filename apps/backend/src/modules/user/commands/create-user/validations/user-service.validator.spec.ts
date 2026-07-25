import { ProviderStatus } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';

import { UserServiceValidator } from './user-service.validator';

describe('UserServiceValidator', () => {
  it('creates new providers as pending and not verified', async () => {
    const validator = new UserServiceValidator();
    const dataSource = {
      service: {
        findMany: jest.fn().mockResolvedValue([{ id: BigInt(1) }]),
      },
      provider: {
        create: jest.fn().mockResolvedValue({ id: BigInt(10) }),
      },
    };

    await validator.validate(
      {
        id: '10',
        services: [BigInt(1)],
      } as any,
      dataSource as any,
    );

    expect(dataSource.provider.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: BigInt(10),
        status: ProviderStatus.PENDING,
        verified: false,
      }),
    });
  });

  it('persists every supported social field using canonical names', async () => {
    const validator = new UserServiceValidator();
    const dataSource = {
      service: {
        findMany: jest.fn().mockResolvedValue([{ id: BigInt(1) }]),
      },
      provider: {
        create: jest.fn().mockResolvedValue({ id: BigInt(10) }),
      },
    };

    await validator.validate(
      {
        id: '10',
        services: [BigInt(1)],
        social: {
          whatsapp: '+5511999999999',
          instagram: '@provider',
          facebook: 'provider',
          linkedin: 'canonical-provider',
        },
      } as any,
      dataSource as any,
    );

    expect(dataSource.provider.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        whatsapp: '+5511999999999',
        instagram: '@provider',
        facebook: 'provider',
        linkedin: 'canonical-provider',
      }),
    });
  });

  it('normalizes legacy linkdin when canonical linkedin is absent', async () => {
    const validator = new UserServiceValidator();
    const dataSource = {
      service: {
        findMany: jest.fn().mockResolvedValue([{ id: BigInt(1) }]),
      },
      provider: {
        create: jest.fn().mockResolvedValue({ id: BigInt(10) }),
      },
    };

    await validator.validate(
      {
        id: '10',
        services: [BigInt(1)],
        social: { linkdin: 'legacy-provider' },
      } as any,
      dataSource as any,
    );

    expect(dataSource.provider.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        linkedin: 'legacy-provider',
      }),
    });
  });

  it('gives canonical linkedin precedence over legacy linkdin', async () => {
    const validator = new UserServiceValidator();
    const dataSource = {
      service: {
        findMany: jest.fn().mockResolvedValue([{ id: BigInt(1) }]),
      },
      provider: {
        create: jest.fn().mockResolvedValue({ id: BigInt(10) }),
      },
    };

    await validator.validate(
      {
        id: '10',
        services: [BigInt(1)],
        social: {
          linkedin: 'canonical-provider',
          linkdin: 'legacy-provider',
        },
      } as any,
      dataSource as any,
    );

    const call = dataSource.provider.create.mock.calls[0][0];
    expect(call.data.linkedin).toBe('canonical-provider');
    expect(call.data).not.toHaveProperty('linkdin');
  });

  it('rejects providers without at least one service', async () => {
    const validator = new UserServiceValidator();

    await expect(
      validator.validate({ services: [] } as any, {} as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects provider service association before the user id exists', async () => {
    const validator = new UserServiceValidator();

    await expect(
      validator.validate({ services: [BigInt(1)] } as any, {} as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects inactive or missing service references', async () => {
    const validator = new UserServiceValidator();
    const dataSource = {
      service: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    await expect(
      validator.validate(
        {
          id: '10',
          services: [BigInt(1)],
        } as any,
        dataSource as any,
      ),
    ).rejects.toThrow('One or more services not found or inactive');
  });
});
