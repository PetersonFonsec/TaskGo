import { createHmac } from 'node:crypto';
import * as nodemailer from 'nodemailer';
import { UserVerificationService } from './user-verification.service';
jest.mock('nodemailer', () => ({ createTransport: jest.fn() }));
describe('Contact verification security', () => {
  let tx: any, service: UserVerificationService, challenge: any;
  const key = 'email:1';
  beforeEach(() => {
    jest.clearAllMocks();
    challenge = {
      key,
      userId: 1n,
      type: 'email',
      target: 'verified@example.invalid',
      tokenHash: createHmac('sha256', 'test-secret')
        .update(`${key}:123456`)
        .digest('hex'),
      attempts: 0,
      expiresAt: new Date(Date.now() + 600000),
    };
    tx = {
      $queryRaw: jest.fn(),
      securityChallenge: {
        findUnique: jest.fn(() => challenge),
        update: jest.fn(async () => {
          challenge.attempts++;
        }),
        delete: jest.fn(async () => {
          challenge = null;
        }),
        upsert: jest.fn(),
        deleteMany: jest.fn(),
      },
      user: {
        findUniqueOrThrow: jest
          .fn()
          .mockResolvedValue({ email: 'old@example.invalid' }),
        update: jest.fn().mockResolvedValue({ id: 1n }),
      },
    };
    tx.$transaction = jest.fn((work) => work(tx));
    (nodemailer.createTransport as jest.Mock).mockReturnValue({
      sendMail: jest.fn().mockResolvedValue({}),
      close: jest.fn(),
    });
    service = new UserVerificationService(tx, {
      get: (k: string) =>
        ({ SMTP_URL: 'smtp://localhost', MAIL_FROM: 'test@example.invalid' })[
          k
        ],
      getOrThrow: () => 'test-secret',
    } as any);
  });
  it('rejects expired codes without modifying the account', async () => {
    challenge.expiresAt = new Date(Date.now() - 1);
    await expect(service.verifyEmailCode(1n, '123456')).rejects.toThrow(
      'expirado',
    );
    expect(tx.user.update).not.toHaveBeenCalled();
  });
  it('commits failed attempts and stops after five even if the next code is correct', async () => {
    for (let i = 0; i < 5; i++)
      await expect(service.verifyEmailCode(1n, '654321')).rejects.toThrow();
    expect(challenge.attempts).toBe(5);
    await expect(service.verifyEmailCode(1n, '123456')).rejects.toThrow();
    expect(tx.user.update).not.toHaveBeenCalled();
  });
  it('consumes once and changes only the contact bound to the challenge, revoking sessions', async () => {
    await service.verifyEmailCode(1n, '123456');
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: 1n },
      data: expect.objectContaining({
        email: 'verified@example.invalid',
        passwordChangedAt: expect.any(Date),
      }),
    });
    await expect(service.verifyEmailCode(1n, '123456')).rejects.toThrow();
    expect(tx.user.update).toHaveBeenCalledTimes(1);
  });
  it('fails closed when SMS delivery is not configured', async () => {
    await expect(
      service.requestPhoneVerification(1n, '11999999999'),
    ).rejects.toMatchObject({ status: 503 });
    expect(tx.securityChallenge.upsert).not.toHaveBeenCalled();
  });
  it('limits resends before replacing a valid code', async () => {
    await expect(
      service.requestEmailVerification(1n, 'new@example.invalid'),
    ).rejects.toThrow('Aguarde');
    expect(tx.securityChallenge.upsert).not.toHaveBeenCalled();
  });
  it('stores only a keyed hash and a ten-minute expiry when issuing', async () => {
    tx.securityChallenge.findUnique.mockResolvedValue(null);
    await service.requestEmailVerification(1n, 'new@example.invalid');
    const data = tx.securityChallenge.upsert.mock.calls[0][0].create;
    expect(data.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(data.target).toBe('new@example.invalid');
    expect(data.expiresAt.getTime() - Date.now()).toBeLessThanOrEqual(600000);
    const email = (nodemailer.createTransport as jest.Mock).mock.results[0]
      .value.sendMail.mock.calls[0][0];
    expect(email.text).toMatch(/\d{6}/);
    expect(data).not.toHaveProperty('code');
  });
});
