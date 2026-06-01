import { Test, TestingModule } from '@nestjs/testing';
import { UserVerificationService } from './user-verification.service';

describe('UserVerificationService', () => {
  let service: UserVerificationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserVerificationService],
    }).compile();

    service = module.get<UserVerificationService>(UserVerificationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should verify email code after request', async () => {
    await service.requestEmailVerification(BigInt(1), 'test@example.com');
    const success = await service.verifyEmailCode(BigInt(1), (service as any).pendingCodes.get('email:1'));
    expect(success).toBe(true);
  });

  it('should fail invalid email code verification', async () => {
    await service.requestEmailVerification(BigInt(2), 'test2@example.com');
    const result = await service.verifyEmailCode(BigInt(2), 'BADCODE');
    expect(result).toBe(false);
  });

  it('should verify phone code after request', async () => {
    await service.requestPhoneVerification(BigInt(3), '+5511999999999');
    const success = await service.verifyPhoneCode(BigInt(3), (service as any).pendingCodes.get('phone:3'));
    expect(success).toBe(true);
  });
});
