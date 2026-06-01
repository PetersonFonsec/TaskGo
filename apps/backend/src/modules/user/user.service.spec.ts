import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UserService } from './user.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UserVerificationService } from './user-verification.service';

describe('UserService', () => {
  let service: UserService;
  let prisma: PrismaService;
  let verificationService: UserVerificationService;

  const mockPrisma = {
    user: {
      update: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  const mockVerificationService = {
    requestEmailVerification: jest.fn(),
    requestPhoneVerification: jest.fn(),
    verifyEmailCode: jest.fn(),
    verifyPhoneCode: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: UserVerificationService, useValue: mockVerificationService },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    prisma = module.get<PrismaService>(PrismaService);
    verificationService = module.get<UserVerificationService>(UserVerificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('updates supported profile fields and ignores unsupported keys', async () => {
    const userId = BigInt(1);
    const updateDto = {
      name: 'New Name',
      email: 'new@example.com',
      phone: '11999999999',
      photoUrl: 'https://example.com/avatar.png',
      password: 'new-secret',
      address: { street: 'Ignored Street' },
      bio: 'Ignored biography',
      services: [BigInt(1)],
    } as any;

    const expectedResult = { id: userId, name: 'New Name' };
    mockPrisma.user.update.mockResolvedValue(expectedResult);

    const result = await service.update(userId, updateDto);

    expect(prisma.user.update).toHaveBeenCalledTimes(1);
    const updateArgs = (prisma.user.update as jest.Mock).mock.calls[0][0];
    expect(updateArgs.where).toEqual({ id: userId });
    expect(updateArgs.data).toEqual(
      expect.objectContaining({
        name: 'New Name',
        email: 'new@example.com',
        phone: '11999999999',
        photoUrl: 'https://example.com/avatar.png',
      }),
    );
    expect(updateArgs.data.address).toBeUndefined();
    expect(updateArgs.data.bio).toBeUndefined();
    expect(updateArgs.data.services).toBeUndefined();
    expect(updateArgs.data.passwordHash).toBeDefined();
    expect(result).toEqual(expectedResult);
  });

  it('throws when no valid profile fields are provided', async () => {
    const userId = BigInt(2);
    const invalidDto = { address: { street: 'Ignored' }, bio: 'Ignored' } as any;

    await expect(service.update(userId, invalidDto)).rejects.toThrow(BadRequestException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('throws when phone is invalid', async () => {
    const userId = BigInt(3);
    const invalidPhoneDto = { phone: 'INVALID' } as any;

    await expect(service.update(userId, invalidPhoneDto)).rejects.toThrow();
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('requests email verification and stores pendingEmail', async () => {
    const userId = BigInt(4);
    const email = 'test@example.com';
    mockPrisma.user.findUnique.mockResolvedValue({ id: userId });
    mockPrisma.user.update.mockResolvedValue({ id: userId, pendingEmail: email, emailVerified: false });

    const result = await service.requestEmailVerification(userId, { email } as any);

    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: userId }, include: { addresses: true, orders: true, reviews: true, provider: true } });
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: userId },
      data: { pendingEmail: email, emailVerified: false },
    } as any);
    expect(verificationService.requestEmailVerification).toHaveBeenCalledWith(userId, email);
    expect(result).toEqual({ id: userId, pendingEmail: email, emailVerified: false });
  });

  it('confirms pending email verification and updates email', async () => {
    const userId = BigInt(5);
    const pendingEmail = 'pending@example.com';
    mockPrisma.user.findUnique.mockResolvedValue({ id: userId, pendingEmail });
    mockVerificationService.verifyEmailCode.mockResolvedValue(true);
    mockPrisma.user.update.mockResolvedValue({ id: userId, email: pendingEmail, pendingEmail: null, emailVerified: true });

    const result = await service.confirmEmailVerification(userId, { verificationCode: 'ABC123' } as any);

    expect(mockVerificationService.verifyEmailCode).toHaveBeenCalledWith(userId, 'ABC123');
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: userId },
      data: { email: pendingEmail, pendingEmail: null, emailVerified: true },
    } as any);
    expect(result).toEqual({ id: userId, email: pendingEmail, pendingEmail: null, emailVerified: true });
  });

  it('requests phone verification and stores pendingPhone', async () => {
    const userId = BigInt(7);
    const phone = '+5511999999999';
    mockPrisma.user.findUnique.mockResolvedValue({ id: userId });
    mockPrisma.user.update.mockResolvedValue({ id: userId, pendingPhone: phone, phoneVerified: false });

    const result = await service.requestPhoneVerification(userId, { phone } as any);

    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: userId },
      data: { pendingPhone: '5511999999999', phoneVerified: false },
    } as any);
    expect(verificationService.requestPhoneVerification).toHaveBeenCalledWith(userId, phone);
    expect(result).toEqual({ id: userId, pendingPhone: phone, phoneVerified: false });
  });

  it('confirms pending phone verification and updates phone', async () => {
    const userId = BigInt(8);
    const pendingPhone = '+5511999999999';
    mockPrisma.user.findUnique.mockResolvedValue({ id: userId, pendingPhone });
    mockVerificationService.verifyPhoneCode.mockResolvedValue(true);
    mockPrisma.user.update.mockResolvedValue({ id: userId, phone: pendingPhone, pendingPhone: null, phoneVerified: true });

    const result = await service.confirmPhoneVerification(userId, { verificationCode: 'XYZ789' } as any);

    expect(mockVerificationService.verifyPhoneCode).toHaveBeenCalledWith(userId, 'XYZ789');
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: userId },
      data: { phone: pendingPhone, pendingPhone: null, phoneVerified: true },
    } as any);
    expect(result).toEqual({ id: userId, phone: pendingPhone, pendingPhone: null, phoneVerified: true });
  });

  it('throws when confirming phone verification with no pending phone', async () => {
    const userId = BigInt(9);
    mockPrisma.user.findUnique.mockResolvedValue({ id: userId });

    await expect(service.confirmPhoneVerification(userId, { verificationCode: 'NOPE' } as any)).rejects.toThrow(BadRequestException);
  });
});
