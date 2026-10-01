import * as bcrypt from 'bcrypt';
import { UserService } from './user.service';

describe('UserService security', () => {
  let prisma: any;
  let verification: any;
  let service: UserService;
  beforeEach(() => {
    prisma = {
      user: {
        update: jest.fn().mockResolvedValue({ id: 1n }),
        findUnique: jest.fn(),
      },
    };
    verification = {
      requestEmailVerification: jest.fn(),
      requestPhoneVerification: jest.fn(),
      verifyEmailCode: jest.fn(),
      verifyPhoneCode: jest.fn(),
    };
    service = new UserService(prisma, verification);
  });
  it.each(['password', 'passwordHash', 'cpf', 'type', 'email'])(
    'rejects direct changes to %s',
    async (key) => {
      await expect(
        service.update(1n, { name: 'Name', [key]: 'attack' } as any),
      ).rejects.toThrow();
      expect(prisma.user.update).not.toHaveBeenCalled();
    },
  );
  it('updates allowed profile fields without changing login identity', async () => {
    await service.update(1n, {
      name: 'New',
      phone: '11999999999',
      photoUrl: 'https://example.invalid/photo',
    });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 1n },
      data: {
        name: 'New',
        phone: '11999999999',
        phoneVerified: false,
        pendingPhone: null,
        photoUrl: 'https://example.invalid/photo',
      },
    });
  });
  it('rejects empty updates and invalid phone numbers', async () => {
    await expect(service.update(1n, {})).rejects.toThrow();
    await expect(service.update(1n, { phone: 'invalid' })).rejects.toThrow();
  });
  it('rejects email change with only a stolen session, without the current password', async () => {
    prisma.user.findUnique.mockResolvedValue({
      passwordHash: await bcrypt.hash('owner passphrase 2026', 4),
    });
    await expect(
      service.requestEmailVerification(1n, {
        email: 'attacker@example.invalid',
        currentPassword: 'incorrect',
      }),
    ).rejects.toThrow('senha atual');
    expect(verification.requestEmailVerification).not.toHaveBeenCalled();
  });
  it('issues a challenge after password verification, without changing the active email', async () => {
    prisma.user.findUnique.mockResolvedValue({
      passwordHash: await bcrypt.hash('owner passphrase 2026', 4),
    });
    await service.requestEmailVerification(1n, {
      email: 'new@example.invalid',
      currentPassword: 'owner passphrase 2026',
    });
    expect(verification.requestEmailVerification).toHaveBeenCalledWith(
      1n,
      'new@example.invalid',
    );
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
  it('confirms through atomic challenge consumption instead of trusting pendingEmail', async () => {
    await service.confirmEmailVerification(1n, { verificationCode: '123456' });
    expect(verification.verifyEmailCode).toHaveBeenCalledWith(1n, '123456');
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
  it('requires password verification for phone verification', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(
      service.requestPhoneVerification(1n, {
        phone: '11999999999',
        currentPassword: 'incorrect',
      }),
    ).rejects.toThrow();
    expect(verification.requestPhoneVerification).not.toHaveBeenCalled();
  });
});
