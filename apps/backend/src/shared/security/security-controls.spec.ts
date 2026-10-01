import { BadRequestException } from '@nestjs/common';
import { validateEnvironment } from '../../config/environment.validation';
import { assertSafePassword, isSafePassword } from './password-policy';
import { AdminMfaService, totp } from './admin-mfa.service';
import { SecurityRateLimitGuard } from './security-rate-limit.guard';
import {
  CUSTOMER_COOKIE,
  readSessionCookie,
  writeSessionCookie,
} from './session-cookie';

describe('Security controls', () => {
  const production = {
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://test/test',
    JWT_SECRET: '0123456789abcdef'.repeat(4),
    PUBLIC_FRONTEND_ORIGINS: 'https://taskgo.test',
    BACKOFFICE_FRONTEND_ORIGINS: 'https://admin.taskgo.test',
    PAYMENTS_SIMULATION: 'false',
    PAGARME_SECRET_KEY: 'test',
    PAGARME_PLATFORM_RECIPIENT_ID: 'test',
    ADMIN_MFA_SECRETS: '{"1":"GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ"}',
    ADMIN_INVITATION_URL: 'https://admin.taskgo.test/activate',
    SMTP_URL: 'smtp://localhost',
    MAIL_FROM: 'test@example.invalid',
    METRICS_TOKEN: 'test-only-metrics-secret-at-least-32-chars',
    PASSWORD_RESET_FRONTEND_URL:
      'https://taskgo.test/authenticate/reset-password',
  };
  it.each(['x', '1234567890', 'password1234', 'a'.repeat(73), 'á'.repeat(37)])(
    'rejects insecure password %s',
    (password) => {
      expect(isSafePassword(password)).toBe(false);
      expect(() => assertSafePassword(password)).toThrow(BadRequestException);
    },
  );
  it('accepts a long passphrase within the bcrypt byte limit', () =>
    expect(isSafePassword('minha frase longa e unica 2026')).toBe(true));
  it.each(['x', 'a'.repeat(64), 'test-secret'])(
    'rejects weak production signing keys',
    (secret) =>
      expect(() =>
        validateEnvironment({ ...production, JWT_SECRET: secret }),
      ).toThrow('JWT_SECRET'),
  );
  it('requires administrative MFA configuration in production', () =>
    expect(() =>
      validateEnvironment({ ...production, ADMIN_MFA_SECRETS: '{}' }),
    ).toThrow('ADMIN_MFA_SECRETS'));
  it('rejects insecure production origins', () =>
    expect(() =>
      validateEnvironment({
        ...production,
        PUBLIC_FRONTEND_ORIGINS: 'http://taskgo.test',
      }),
    ).toThrow('HTTPS'));
  it('accepts a complete production configuration', () =>
    expect(validateEnvironment(production).EXPIRES_IN).toBe('15m'));
  it('matches RFC 6238 at time 59 seconds', () =>
    expect(totp('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', 1)).toBe('287082'));
  it('rejects MFA replay and fails closed for an unprovisioned administrator', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(59000);
    const prisma = {
      adminUser: {
        updateMany: jest
          .fn()
          .mockResolvedValueOnce({ count: 1 })
          .mockResolvedValueOnce({ count: 0 }),
      },
    };
    const config = {
      get: (key: string) =>
        key === 'ADMIN_MFA_SECRETS'
          ? production.ADMIN_MFA_SECRETS
          : 'production',
    };
    const service = new AdminMfaService(prisma as any, config as any);
    await expect(service.verify(1n, '287082')).resolves.toBeUndefined();
    await expect(service.verify(1n, '287082')).rejects.toThrow();
    await expect(service.verify(2n, '287082')).rejects.toThrow();
    jest.restoreAllMocks();
  });
  it('sets an HttpOnly cookie and does not expose it through the body', () => {
    const response = { cookie: jest.fn(), setHeader: jest.fn() };
    writeSessionCookie(response as any, 'sensitive');
    expect(response.cookie).toHaveBeenCalledWith(
      CUSTOMER_COOKIE,
      'sensitive',
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 900000,
      }),
    );
    expect(
      readSessionCookie(
        { headers: { cookie: 'other=1; taskgo_session=abc' } },
        CUSTOMER_COOKIE,
      ),
    ).toBe('abc');
  });
  const context = (req: any, res: any = { setHeader: jest.fn() }) => ({
    switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }),
  });
  const config = {
    get: (key: string) =>
      ({
        'app.nodeEnv': 'production',
        'app.publicOrigins': 'https://taskgo.test',
        'app.backofficeOrigins': 'https://admin.taskgo.test',
      })[key],
  };
  it.each([undefined, 'https://attacker.test'])(
    'rejects cookie-authenticated writes with untrusted origin %s',
    async (origin) => {
      const guard = new SecurityRateLimitGuard({} as any, config as any);
      await expect(
        guard.canActivate(
          context({
            method: 'POST',
            path: '/orders',
            headers: { cookie: 'taskgo_session=abc', origin },
          }) as any,
        ),
      ).rejects.toMatchObject({ status: 403 });
    },
  );
  it('uses database counters and returns Retry-After when exceeded', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([{ count: 121, retryAfter: 42 }]),
    };
    const response = { setHeader: jest.fn() };
    const guard = new SecurityRateLimitGuard(prisma as any, config as any);
    await expect(
      guard.canActivate(
        context(
          { method: 'GET', path: '/provider', headers: {}, ip: '127.0.0.1' },
          response,
        ) as any,
      ),
    ).rejects.toMatchObject({ status: 429 });
    expect(response.setHeader).toHaveBeenCalledWith('Retry-After', 42);
  });
});
