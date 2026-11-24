import { ConfigService } from '@nestjs/config';

import { createEmailTransport } from './email.module';
import { LogEmailTransport } from './log-email.transport';
import { ResendEmailTransport } from './resend-email.transport';
import { SmtpEmailTransport } from './smtp-email.transport';

describe('createEmailTransport', () => {
  const config = (values: Record<string, string>) =>
    ({ get: (key: string) => values[key] }) as unknown as ConfigService;

  it('usa o Resend quando há chave e remetente', () => {
    const transport = createEmailTransport(
      config({
        RESEND_API_KEY: 're_x',
        SMTP_URL: 'smtp://localhost:1025',
        MAIL_FROM: 'Proxi <nao-responda@proxi.test>',
      }),
    );
    expect(transport).toBeInstanceOf(ResendEmailTransport);
    expect(transport.configured).toBe(true);
  });

  it('usa SMTP quando não há chave do Resend', () => {
    expect(
      createEmailTransport(
        config({ SMTP_URL: 'smtp://localhost:1025', MAIL_FROM: 'a@b.test' }),
      ),
    ).toBeInstanceOf(SmtpEmailTransport);
  });

  it('só registra no log sem remetente ou provedor', () => {
    const transport = createEmailTransport(config({ RESEND_API_KEY: 're_x' }));
    expect(transport).toBeInstanceOf(LogEmailTransport);
    expect(transport.configured).toBe(false);
  });
});
