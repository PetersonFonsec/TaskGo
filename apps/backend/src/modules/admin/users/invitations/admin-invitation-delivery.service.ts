import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
export interface AdminInvitationDeliveryInput {
  email: string;
  name: string;
  token: string;
  activationUrl: string;
  expiresAt: Date;
}
@Injectable()
export class AdminInvitationDeliveryService {
  constructor(private readonly config: ConfigService) {}
  async deliver(input: AdminInvitationDeliveryInput): Promise<void> {
    const smtp = this.config.getOrThrow<string>('SMTP_URL');
    const from = this.config.getOrThrow<string>('MAIL_FROM');
    const transport = nodemailer.createTransport({
      url: smtp,
      requireTLS: process.env.NODE_ENV === 'production',
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 10000,
    });
    try {
      await transport.sendMail({
        from,
        to: input.email,
        subject: 'Convite para o TaskGo Backoffice',
        text: `Olá, ${input.name}. Ative seu acesso em ${input.activationUrl}. O convite expira em ${input.expiresAt.toISOString()}.`,
      });
    } finally {
      transport.close();
    }
  }
}
