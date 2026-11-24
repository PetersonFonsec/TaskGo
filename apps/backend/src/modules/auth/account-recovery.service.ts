import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailTransport } from '../notification/email-transport';
import { renderEmail } from '../notification/email-template';

@Injectable()
export class AccountRecoveryService {
  private readonly logger = new Logger(AccountRecoveryService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly email: EmailTransport,
  ) {}

  async request(email: string) {
    // Validate delivery configuration before looking up an account: no existence leak.
    const frontend = this.config.get<string>('PASSWORD_RESET_FRONTEND_URL');
    if (!this.email.configured || !frontend)
      throw new ServiceUnavailableException(
        'Recuperação de acesso temporariamente indisponível',
      );
    const resetUrl = new URL(frontend);
    if (
      resetUrl.protocol !== 'https:' &&
      this.config.get('NODE_ENV') === 'production'
    )
      throw new ServiceUnavailableException(
        'Recuperação de acesso temporariamente indisponível',
      );
    const response = {
      message:
        'Se houver uma conta para este e-mail, enviaremos as instruções de recuperação.',
    };
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });
    if (!user) return response;
    const token = randomBytes(32).toString('hex');
    const tokenHash = this.hash(token);
    const now = new Date();
    const created = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM usuarios WHERE id = ${user.id} FOR UPDATE`;
      const recent = await tx.passwordResetToken.findFirst({
        where: {
          userId: user.id,
          createdAt: { gt: new Date(now.getTime() - 60000) },
        },
      });
      if (recent) return false;
      await tx.passwordResetToken.deleteMany({ where: { userId: user.id } });
      await tx.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt: new Date(now.getTime() + 30 * 60000),
        },
      });
      return true;
    });
    if (!created) return response;
    // Fragment avoids tokens in reverse-proxy access logs and referrer headers.
    resetUrl.hash = `token=${token}`;
    try {
      await this.email.send({
        to: user.email,
        category: 'password-reset',
        // Um token por envio: a chave evita duplicar o e-mail numa retentativa.
        idempotencyKey: `password-reset/${tokenHash}`,
        ...renderEmail({
          subject: 'Recuperação de acesso Proxi',
          preheader: 'Crie uma nova senha para sua conta.',
          paragraphs: [
            'Recebemos um pedido para criar uma nova senha para sua conta na Proxi.',
          ],
          cta: { label: 'Criar nova senha', url: resetUrl.toString() },
          footnote:
            'O link expira em 30 minutos. Se você não solicitou, ignore esta mensagem: sua senha continua a mesma.',
        }),
      });
    } catch {
      await this.prisma.passwordResetToken.deleteMany({ where: { tokenHash } });
      this.logger.error('Password recovery email delivery failed');
    }
    return response;
  }

  async reset(token: string, password: string) {
    if (
      !/^[a-f0-9]{64}$/.test(token) ||
      password.length < 10 ||
      Buffer.byteLength(password, 'utf8') > 72
    )
      throw new BadRequestException(
        'Link inválido ou senha fora dos limites (10 caracteres a 72 bytes)',
      );
    const tokenHash = this.hash(token);
    const candidate = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });
    if (!candidate || candidate.expiresAt <= new Date())
      throw new BadRequestException('Link inválido ou expirado');
    const passwordHash = await bcrypt.hash(password, 12);
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM usuarios WHERE id = ${candidate.userId} FOR UPDATE`;
      const consumed = await tx.passwordResetToken.deleteMany({
        where: { tokenHash, expiresAt: { gt: new Date() } },
      });
      if (consumed.count !== 1)
        throw new BadRequestException('Link inválido ou expirado');
      await tx.user.update({
        where: { id: candidate.userId },
        data: { passwordHash, passwordChangedAt: new Date() },
      });
      await tx.passwordResetToken.deleteMany({
        where: { userId: candidate.userId },
      });
    });
    return { message: 'Senha atualizada. Entre novamente.' };
  }

  private hash(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
}
