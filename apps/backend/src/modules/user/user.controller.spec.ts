import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import type { PublicUserProfile } from '@taskgo/shared';
import { UserController } from './user.controller';
import { UserService } from './user.service';

describe('UserController', () => {
  let controller: UserController;
  let mockUserService: Partial<UserService>;
  let queryBus: { execute: jest.Mock };

  const publicProfile: PublicUserProfile = {
    id: '42',
    name: 'Customer User',
    email: 'customer@example.com',
    phone: '5511999999999',
    cpf: '12345678901',
    type: 'CLIENTE',
    photoUrl: null,
    bio: null,
  };

  beforeEach(async () => {
    mockUserService = {
      update: jest.fn().mockResolvedValue({
        id: BigInt(42),
        name: 'Updated User',
        email: 'updated@example.com',
        phone: '5511888888888',
        cpf: '12345678901',
        type: 'CLIENTE',
        photoUrl: null,
        bio: null,
        createdAt: new Date('2026-07-09T12:00:00.000Z'),
        updatedAt: new Date('2026-07-09T12:30:00.000Z'),
        passwordHash: 'SECRET',
      }),
      requestEmailVerification: jest.fn().mockResolvedValue({}),
      requestPhoneVerification: jest.fn().mockResolvedValue({}),
      confirmEmailVerification: jest.fn().mockResolvedValue({}),
      confirmPhoneVerification: jest.fn().mockResolvedValue({}),
    };
    queryBus = { execute: jest.fn().mockResolvedValue(publicProfile) };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: QueryBus,
          useValue: queryBus,
        },
        {
          provide: CommandBus,
          useValue: { execute: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('returns a shared public profile from findOne', async () => {
    const result = await controller.findOne('42');

    expect(queryBus.execute).toHaveBeenCalledWith(expect.objectContaining({ id: BigInt(42) }));
    expect(result).toEqual(publicProfile);
    expect(result).not.toHaveProperty('password');
    expect(result).not.toHaveProperty('orders');
    expect(result).not.toHaveProperty('provider');
  });

  it('maps profile updates to a shared public profile with string ids and timestamps', async () => {
    const result = await controller.update('42', {
      name: 'Updated User',
      email: 'updated@example.com',
      phone: '5511888888888',
    } as any);

    expect(mockUserService.update).toHaveBeenCalledWith(BigInt(42), {
      name: 'Updated User',
      email: 'updated@example.com',
      phone: '5511888888888',
    });
    expect(result).toEqual(
      expect.objectContaining({
        id: '42',
        name: 'Updated User',
        email: 'updated@example.com',
        createdAt: '2026-07-09T12:00:00.000Z',
        updatedAt: '2026-07-09T12:30:00.000Z',
      }),
    );
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('should request email verification', async () => {
    const result = await controller.requestEmailVerification('1', { email: 'test@example.com' } as any);
    expect(mockUserService.requestEmailVerification).toHaveBeenCalledWith(BigInt(1), { email: 'test@example.com' });
    expect(result).toEqual({});
  });

  it('should confirm email verification', async () => {
    const result = await controller.confirmEmailVerification('1', { verificationCode: 'CODE' } as any);
    expect(mockUserService.confirmEmailVerification).toHaveBeenCalledWith(BigInt(1), { verificationCode: 'CODE' });
    expect(result).toEqual({});
  });

  it('should request phone verification', async () => {
    const result = await controller.requestPhoneVerification('2', { phone: '+5511999999999' } as any);
    expect(mockUserService.requestPhoneVerification).toHaveBeenCalledWith(BigInt(2), { phone: '+5511999999999' });
    expect(result).toEqual({});
  });

  it('should confirm phone verification', async () => {
    const result = await controller.confirmPhoneVerification('2', { verificationCode: 'CODE' } as any);
    expect(mockUserService.confirmPhoneVerification).toHaveBeenCalledWith(BigInt(2), { verificationCode: 'CODE' });
    expect(result).toEqual({});
  });
});
