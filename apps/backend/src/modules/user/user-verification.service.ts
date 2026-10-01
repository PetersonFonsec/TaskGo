import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UserVerificationService {
  private readonly logger = new Logger(UserVerificationService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}
  private hash(key: string, code: string) {
    return createHmac(
      'sha256',
      this.config.getOrThrow<string>('auth.jwtSecret'),
    )
      .update(`${key}:${code}`)
      .digest('hex');
  }
  async requestEmailVerification(userId: bigint, email: string) {
    return this.issue(userId, 'email', email);
  }
  async requestPhoneVerification(userId: bigint, phone: string) {
    return this.issue(userId, 'phone', phone);
  }
  private async issue(userId: bigint, type: 'email' | 'phone', target: string) {
    const smtp = this.config.get<string>('SMTP_URL');
    const from = this.config.get<string>('MAIL_FROM');
    const smsAccount = this.config.get<string>('TWILIO_ACCOUNT_SID');
    const smsToken = this.config.get<string>('TWILIO_AUTH_TOKEN');
    const smsFrom = this.config.get<string>('TWILIO_FROM');
    if (
      (type === 'email' && (!smtp || !from)) ||
      (type === 'phone' && (!smsAccount || !smsToken || !smsFrom))
    )
      throw new ServiceUnavailableException(
        'Verificação de contato temporariamente indisponível',
      );
    const key = `${type}:${userId}`;
    const code = String(randomInt(0, 1000000)).padStart(6, '0');
    const tokenHash = this.hash(key, code);
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM usuarios WHERE id = ${userId} FOR UPDATE`;
      const previous = await tx.securityChallenge.findUnique({
        where: { key },
      });
      if (previous && previous.expiresAt.getTime() > Date.now() + 9 * 60000)
        throw new BadRequestException(
          'Aguarde um minuto antes de solicitar outro código',
        );
      await tx.securityChallenge.upsert({
        where: { key },
        create: {
          key,
          userId,
          type,
          target,
          tokenHash,
          expiresAt: new Date(Date.now() + 10 * 60000),
        },
        update: {
          target,
          tokenHash,
          attempts: 0,
          expiresAt: new Date(Date.now() + 10 * 60000),
        },
      });
      await tx.user.update({
        where: { id: userId },
        data:
          type === 'email'
            ? { pendingEmail: target }
            : { pendingPhone: target },
      });
    });
    try {
      if (type === 'email') {
        const transport = nodemailer.createTransport({
          url: smtp!,
          requireTLS: process.env.NODE_ENV === 'production',
          connectionTimeout: 5000,
          greetingTimeout: 5000,
          socketTimeout: 10000,
        });
        try {
          await transport.sendMail({
            from,
            to: target,
            subject: 'Confirme seu e-mail TaskGo',
            text: `Seu código é ${code}. Ele expira em 10 minutos. Se você não solicitou, ignore esta mensagem.`,
          });
        } finally {
          transport.close();
        }
      } else {
        const response = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(smsAccount!)}/Messages.json`,
          {
            method: 'POST',
            redirect: 'error',
            signal: AbortSignal.timeout(10000),
            headers: {
              Authorization: `Basic ${Buffer.from(`${smsAccount}:${smsToken}`).toString('base64')}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              To: target.startsWith('+') ? target : `+55${target}`,
              From: smsFrom!,
              Body: `Seu código TaskGo é ${code}. Expira em 10 minutos.`,
            }),
          },
        );
        if (!response.ok) throw new Error('Delivery failed');
      }
    } catch {
      await this.prisma.securityChallenge.deleteMany({
        where: { key, tokenHash },
      });
      this.logger.error('Contact verification delivery failed');
      throw new ServiceUnavailableException('Não foi possível enviar o código');
    }
  }
  async verifyEmailCode(userId: bigint, code: string) {
    return this.consume(userId, 'email', code);
  }
  async verifyPhoneCode(userId: bigint, code: string) {
    return this.consume(userId, 'phone', code);
  }
  private async consume(userId: bigint, type: 'email' | 'phone', code: string) {
    const key = `${type}:${userId}`;
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM usuarios WHERE id = ${userId} FOR UPDATE`;
      const challenge = await tx.securityChallenge.findUnique({
        where: { key },
      });
      if (
        !challenge ||
        challenge.expiresAt <= new Date() ||
        challenge.attempts >= 5
      )
        return null;
      const supplied = this.hash(key, code);
      if (
        !/^\d{6}$/.test(code) ||
        !timingSafeEqual(
          Buffer.from(supplied),
          Buffer.from(challenge.tokenHash),
        )
      ) {
        await tx.securityChallenge.update({
          where: { key },
          data: { attempts: { increment: 1 } },
        });
        return null; // Commit the failed-attempt counter before returning an error.
      }
      const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      const updated = await tx.user.update({
        where: { id: userId },
        data:
          type === 'email'
            ? {
                email: challenge.target,
                pendingEmail: null,
                emailVerified: true,
                passwordChangedAt: new Date(),
              }
            : {
                phone: challenge.target,
                pendingPhone: null,
                phoneVerified: true,
              },
      });
      await tx.securityChallenge.delete({ where: { key } });
      return { updated, previousEmail: user.email };
    });
    if (!result)
      throw new BadRequestException(
        'Código inválido, expirado ou com tentativas excedidas',
      );
    if (type === 'email') {
      const transport = nodemailer.createTransport({
        url: this.config.getOrThrow<string>('SMTP_URL'),
        requireTLS: process.env.NODE_ENV === 'production',
        connectionTimeout: 5000,
        greetingTimeout: 5000,
        socketTimeout: 10000,
      });
      try {
        await transport.sendMail({
          from: this.config.getOrThrow<string>('MAIL_FROM'),
          to: result.previousEmail,
          subject: 'E-mail da conta TaskGo alterado',
          text: 'O e-mail da sua conta foi alterado e as sessões anteriores foram invalidadas. Se não foi você, entre em contato com o suporte imediatamente.',
        });
      } catch {
        this.logger.error('Contact change notification delivery failed');
      } finally {
        transport.close();
      }
    }
    return result.updated;
  }
}
