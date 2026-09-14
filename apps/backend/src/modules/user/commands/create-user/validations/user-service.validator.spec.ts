import { ProviderStatus } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';

import { UserServiceValidator } from './user-service.validator';

describe('UserServiceValidator', () => {
  it('creates new providers as pending and not verified', async () => {
    const validator = new UserServiceValidator();
    const dataSource = {
      subcategory: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            { id: BigInt(1), name: 'Repair', category: { slug: 'repairs' } },
          ]),
      },
      provider: {
        create: jest.fn().mockResolvedValue({ id: BigInt(10) }),
      },
    };

    await validator.validate(
      {
        id: '10',
        address: { lat: -23.5, lng: -46.6 },
        subcategoryIds: [BigInt(1)],
      } as any,
      dataSource as any,
    );

    expect(dataSource.provider.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: BigInt(10),
        status: ProviderStatus.PENDING,
        verified: false,
        services: {
          create: [
            {
              title: 'Repair',
              category: 'repairs',
              basePrice: 0,
              status: 'INATIVO',
            },
          ],
        },
      }),
    });
  });

  it('persists every supported social field using canonical names', async () => {
    const validator = new UserServiceValidator();
    const dataSource = {
      subcategory: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            { id: BigInt(1), name: 'Repair', category: { slug: 'repairs' } },
          ]),
      },
      provider: {
        create: jest.fn().mockResolvedValue({ id: BigInt(10) }),
      },
    };

    await validator.validate(
      {
        id: '10',
        address: { lat: -23.5, lng: -46.6 },
        subcategoryIds: [BigInt(1)],
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
      subcategory: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            { id: BigInt(1), name: 'Repair', category: { slug: 'repairs' } },
          ]),
      },
      provider: {
        create: jest.fn().mockResolvedValue({ id: BigInt(10) }),
      },
    };

    await validator.validate(
      {
        id: '10',
        address: { lat: -23.5, lng: -46.6 },
        subcategoryIds: [BigInt(1)],
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
      subcategory: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            { id: BigInt(1), name: 'Repair', category: { slug: 'repairs' } },
          ]),
      },
      provider: {
        create: jest.fn().mockResolvedValue({ id: BigInt(10) }),
      },
    };

    await validator.validate(
      {
        id: '10',
        address: { lat: -23.5, lng: -46.6 },
        subcategoryIds: [BigInt(1)],
        social: {
          linkedin: 'canonical-provider',
          linkdin: 'legacy-provider',
        },
      } as any,
      dataSource as any,
    );

    const call = (dataSource.provider.create as jest.Mock).mock.calls[0][0];
    expect(call.data.linkedin).toBe('canonical-provider');
    expect(call.data).not.toHaveProperty('linkdin');
  });

  it('rejects providers without at least one service', async () => {
    const validator = new UserServiceValidator();

    await expect(
      validator.validate({ subcategoryIds: [] } as any, {} as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects provider service association before the user id exists', async () => {
    const validator = new UserServiceValidator();

    await expect(
      validator.validate({ subcategoryIds: [BigInt(1)] } as any, {} as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects inactive or missing subcategory references', async () => {
    const validator = new UserServiceValidator();
    const dataSource = {
      subcategory: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    await expect(
      validator.validate(
        {
          id: '10',
          address: { lat: -23.5, lng: -46.6 },
          subcategoryIds: [BigInt(1)],
        } as any,
        dataSource as any,
      ),
    ).rejects.toThrow('Especialidade inexistente ou inativa');
  });
});
