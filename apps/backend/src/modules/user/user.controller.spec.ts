import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { UserController } from './user.controller';
import { UserService } from './user.service';

describe('UserController', () => {
  let controller: UserController;
  let mockUserService: Partial<UserService>;

  beforeEach(async () => {
    mockUserService = {
      requestEmailVerification: jest.fn().mockResolvedValue({}),
      requestPhoneVerification: jest.fn().mockResolvedValue({}),
      confirmEmailVerification: jest.fn().mockResolvedValue({}),
      confirmPhoneVerification: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: QueryBus,
          useValue: { execute: jest.fn() },
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
