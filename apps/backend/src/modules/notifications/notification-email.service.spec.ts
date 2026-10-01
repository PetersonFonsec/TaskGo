import { Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { NotificationEmailService } from './notification-email.service';
import { WelcomeEmailHandler } from './notifications.module';

jest.mock('nodemailer', () => ({ createTransport: jest.fn() }));

describe('Transactional notification emails', () => {
  let service: NotificationEmailService;
  let mail: any;
  let prisma: any;
  let config: Record<string, string>;
  beforeEach(() => {
    config = {
      SMTP_URL: 'smtp://localhost:1025',
      MAIL_FROM: 'Proxi <noreply@example.com>',
      NOTIFICATION_FRONTEND_URL: 'https://app.example.com',
    };
    mail = { sendMail: jest.fn().mockResolvedValue({}), close: jest.fn() };
    (nodemailer.createTransport as jest.Mock).mockReturnValue(mail);
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
    service = new NotificationEmailService(prisma, {
      get: (key: string) => config[key],
    } as any);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  it('sends welcome from the committed user event', async () => {
    await new WelcomeEmailHandler(service).handle({ user: { id: '7' } } as any);
    expect(prisma.user.findUniqueOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 7n } }),
    );
    expect(mail.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'ana@example.com',
        subject: 'Boas-vindas à Proxi!',
      }),
    );
    expect(mail.close).toHaveBeenCalled();
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
      expect(mail.sendMail).toHaveBeenCalledTimes(1);
      expect(mail.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to,
          from: config.MAIL_FROM,
          text: expect.stringContaining(`https://app.example.com${path}`),
        }),
      );
      expect(mail.sendMail.mock.calls[0][0].text).toContain('Limpeza');
      if (kind === 'requested' || kind === 'accepted') {
        expect(mail.sendMail.mock.calls[0][0].text).toContain('12:00');
      }
    },
  );

  it('does not fail an already committed action or leak SMTP errors', async () => {
    mail.sendMail.mockRejectedValue(new Error('secret SMTP credential'));
    await expect(service.order('accepted', 42n)).resolves.toBeUndefined();
    expect(mail.close).toHaveBeenCalled();
    expect(Logger.prototype.error).toHaveBeenCalledWith(
      'Notification email delivery failed (accepted)',
    );
  });

  it.each(['missing', 'insecure', 'invalid'])(
    'does not send with %s configuration',
    async (scenario) => {
      if (scenario === 'missing') delete config.SMTP_URL;
      if (scenario === 'insecure') {
        config.NODE_ENV = 'production';
        config.NOTIFICATION_FRONTEND_URL = 'http://app.example.com';
      }
      if (scenario === 'invalid')
        config.NOTIFICATION_FRONTEND_URL = 'javascript:alert(1)';
      await expect(service.welcome('7')).resolves.toBeUndefined();
      expect(mail.sendMail).not.toHaveBeenCalled();
    },
  );
});
