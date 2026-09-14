import { AccountRecoveryService } from './account-recovery.service';
import { createHash } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import * as nodemailer from 'nodemailer';
jest.mock('nodemailer', () => ({ createTransport: jest.fn() }));

describe('AccountRecoveryService', () => {
  const token = 'a'.repeat(64);
  const tokenHash = createHash('sha256').update(token).digest('hex');
  function setup() {
    const prisma: any = {
      user: {
        findUnique: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
      },
      passwordResetToken: {
        findUnique: jest.fn().mockResolvedValue({
          userId: 1n,
          tokenHash,
          expiresAt: new Date(Date.now() + 60000),
        }),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      $queryRaw: jest.fn(),
    };
    prisma.$transaction = jest.fn((callback) => callback(prisma));
    const values: Record<string, string> = {
      SMTP_URL: 'smtp://localhost:1025',
      MAIL_FROM: 'Proxi <noreply@example.invalid>',
      PASSWORD_RESET_FRONTEND_URL:
        'https://proxi.example/authenticate/reset-password',
    };
    const config: any = { get: jest.fn((key) => values[key]) };
    const mail = {
      sendMail: jest.fn().mockResolvedValue({}),
      close: jest.fn(),
    };
    (nodemailer.createTransport as jest.Mock).mockReturnValue(mail);
    return {
      service: new AccountRecoveryService(prisma, config),
      prisma,
      config,
      mail,
    };
  }
  it('returns generic response for unknown accounts without creating a session token', async () => {
    const { service, prisma, mail } = setup();
    expect(await service.request('unknown@example.invalid')).toEqual({
      message: expect.stringContaining('Se houver'),
    });
    expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
    expect(mail.sendMail).not.toHaveBeenCalled();
  });
  it('stores only a hash and delivers a separate expiring reset token in URL fragment', async () => {
    const { service, prisma, mail } = setup();
    prisma.user.findUnique.mockResolvedValue({
      id: 1n,
      email: 'user@example.invalid',
    });
    await service.request('user@example.invalid');
    const data = prisma.passwordResetToken.create.mock.calls[0][0].data;
    const text = mail.sendMail.mock.calls[0][0].text;
    const sentToken = text.match(/#token=([a-f0-9]{64})/)[1];
    expect(data.tokenHash).toBe(
      createHash('sha256').update(sentToken).digest('hex'),
    );
    expect(data.tokenHash).not.toBe(sentToken);
    expect(data.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });
  it('limits repeated delivery per account', async () => {
    const { service, prisma, mail } = setup();
    prisma.user.findUnique.mockResolvedValue({
      id: 1n,
      email: 'user@example.invalid',
    });
    prisma.passwordResetToken.findFirst.mockResolvedValue({});
    await service.request('user@example.invalid');
    expect(mail.sendMail).not.toHaveBeenCalled();
  });
  it('rejects expired tokens without changing a password', async () => {
    const { service, prisma } = setup();
    prisma.passwordResetToken.findUnique.mockResolvedValue({
      expiresAt: new Date(0),
    });
    await expect(service.reset(token, 'new-password-123')).rejects.toThrow(
      'expirado',
    );
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
  it('atomically consumes a token and stores a hash plus session revocation timestamp', async () => {
    const { service, prisma } = setup();
    await service.reset(token, 'new-password-123');
    const data = prisma.user.update.mock.calls[0][0].data;
    expect(await bcrypt.compare('new-password-123', data.passwordHash)).toBe(
      true,
    );
    expect(data.passwordChangedAt).toBeInstanceOf(Date);
    expect(prisma.passwordResetToken.deleteMany).toHaveBeenCalledWith({
      where: { tokenHash, expiresAt: { gt: expect.any(Date) } },
    });
  });
  it('rejects a token consumed concurrently before updating the account', async () => {
    const { service, prisma } = setup();
    prisma.passwordResetToken.deleteMany.mockResolvedValue({ count: 0 });
    await expect(service.reset(token, 'new-password-123')).rejects.toThrow(
      'expirado',
    );
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
  it('rejects passwords that bcrypt would truncate', async () => {
    const { service } = setup();
    await expect(service.reset(token, 'á'.repeat(40))).rejects.toThrow(
      '72 bytes',
    );
  });
});
