import { Logger } from '@nestjs/common';
import { NotificationEmailService } from './notification-email.service';
import { WelcomeEmailHandler } from './notifications.module';

describe('Transactional notification emails', () => {
  let service: NotificationEmailService;
  let mail: any;
  let prisma: any;
  let config: Record<string, string>;
  beforeEach(() => {
    config = {
      NOTIFICATION_FRONTEND_URL: 'https://app.example.com',
    };
    mail = { configured: true, send: jest.fn().mockResolvedValue(undefined) };
    prisma = {
      user: {
        findUniqueOrThrow: jest
          .fn()
          .mockResolvedValue({ name: 'Ana', email: 'ana@example.com' }),
      },
      order: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          scheduledFor: new Date('2026-09-20T15:00:00Z'),
          client: { name: 'Ana', email: 'ana@example.com' },
          service: {
            title: 'Limpeza',
            provider: { user: { name: 'João', email: 'joao@example.com' } },
          },
        }),
      },
    };
    service = new NotificationEmailService(
      prisma,
      { get: (key: string) => config[key] } as any,
      mail,
    );
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  it('sends welcome from the committed user event', async () => {
    await new WelcomeEmailHandler(service).handle({ user: { id: '7' } } as any);
    expect(prisma.user.findUniqueOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 7n } }),
    );
    expect(mail.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'ana@example.com',
        subject: 'Boas-vindas à Proxi!',
        category: 'welcome',
        idempotencyKey: 'welcome/7',
        html: expect.stringContaining('Acessar minha conta'),
      }),
    );
  });

  it.each([
    ['requested', 'joao@example.com', '/orders/42'],
    ['accepted', 'ana@example.com', '/orders/42'],
    ['finished', 'ana@example.com', '/orders/42/confirm'],
    ['review', 'ana@example.com', '/orders/42/review'],
  ] as const)(
    'sends %s to the correct recipient and action',
    async (kind, to, path) => {
      await service.order(kind, 42n);
      expect(mail.send).toHaveBeenCalledTimes(1);
      expect(mail.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to,
          category: kind,
          idempotencyKey: `order-${kind}/42`,
          text: expect.stringContaining(`https://app.example.com${path}`),
        }),
      );
      expect(mail.send.mock.calls[0][0].text).toContain('Limpeza');
      if (kind === 'requested' || kind === 'accepted') {
        expect(mail.send.mock.calls[0][0].text).toContain('12:00');
      }
    },
  );

  it('does not fail an already committed action or leak provider errors', async () => {
    mail.send.mockRejectedValue(new Error('secret provider credential'));
    await expect(service.order('accepted', 42n)).resolves.toBeUndefined();
    expect(Logger.prototype.error).toHaveBeenCalledWith(
      'Notification email delivery failed (accepted)',
    );
  });

  it.each(['insecure', 'invalid'])(
    'does not send with %s configuration',
    async (scenario) => {
      if (scenario === 'insecure') {
        config.NODE_ENV = 'production';
        config.NOTIFICATION_FRONTEND_URL = 'http://app.example.com';
      }
      if (scenario === 'invalid')
        config.NOTIFICATION_FRONTEND_URL = 'javascript:alert(1)';
      await expect(service.welcome('7')).resolves.toBeUndefined();
      expect(mail.send).not.toHaveBeenCalled();
    },
  );
});
