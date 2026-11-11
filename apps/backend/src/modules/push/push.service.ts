import { Injectable, Logger } from '@nestjs/common';
import { DevicePlatform } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { lockSession } from '../auth/session-lock';
import { PushMessage, PushTransport } from './push-transport';

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly transport: PushTransport,
  ) {}

  /**
   * Registra (ou transfere) o token para o usuário e a sessão atuais. Um token
   * pertence a um aparelho só: se outra conta entrou no mesmo aparelho, ele
   * muda de dono e de sessão, e a conta anterior deixa de receber nele.
   *
   * Só registra se a sessão estiver ativa e for do usuário. A checagem e a
   * gravação rodam sob o mesmo bloqueio de sessão usado no logout, então um
   * logout concorrente nunca deixa o aparelho vinculado. Devolve false quando
   * a sessão não está ativa.
   */
  async registerDevice(
    userId: bigint,
    token: string,
    platform: DevicePlatform,
    sessionFamilyId: string,
  ): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      await lockSession(tx, sessionFamilyId);
      const [active] = await tx.$queryRaw<Array<{ id: bigint }>>`
        SELECT id FROM refresh_tokens
         WHERE family_id = ${sessionFamilyId}
           AND usuario_id = ${userId}
           AND revoked_at IS NULL
           AND used_at IS NULL
           AND expires_at > (now() AT TIME ZONE 'UTC')
         LIMIT 1`;
      if (!active) return false;
      await tx.deviceToken.upsert({
        where: { token },
        create: { userId, token, platform, sessionFamilyId },
        update: { userId, platform, sessionFamilyId, lastSeenAt: new Date() },
      });
      return true;
    });
  }

  /**
   * Remove o aparelho do usuário. Uma sessão só remove os aparelhos dela ou
   * os registrados sem sessão; nunca os de outra sessão da mesma conta.
   */
  async unregisterDevice(
    userId: bigint,
    token: string,
    sessionFamilyId: string | null = null,
  ): Promise<void> {
    await this.prisma.deviceToken.deleteMany({
      where: sessionFamilyId
        ? {
            userId,
            token,
            OR: [{ sessionFamilyId }, { sessionFamilyId: null }],
          }
        : { userId, token, sessionFamilyId: null },
    });
  }

  /**
   * Nunca rejeita: o push complementa o e-mail e não pode travar o pedido.
   * Só envia para aparelhos ligados a uma sessão ativa do usuário. Registros
   * legados sem sessão não recebem e são apagados aqui; o app volta a
   * registrá-los depois de um novo login.
   */
  async sendToUser(userId: bigint, message: PushMessage): Promise<void> {
    try {
      await this.prisma.deviceToken.deleteMany({
        where: { userId, sessionFamilyId: null },
      });
      const devices = await this.prisma.$queryRaw<Array<{ token: string }>>`
        SELECT d.token FROM device_tokens d
         WHERE d.usuario_id = ${userId}
           AND EXISTS (
             SELECT 1 FROM refresh_tokens r
              WHERE r.family_id = d.session_family_id
                AND r.usuario_id = d.usuario_id
                AND r.revoked_at IS NULL
                AND r.used_at IS NULL
                AND r.expires_at > (now() AT TIME ZONE 'UTC'))`;
      if (devices.length === 0) return;
      const { invalidTokens } = await this.transport.send(
        devices.map((device) => device.token),
        message,
      );
      if (invalidTokens.length > 0) {
        await this.prisma.deviceToken.deleteMany({
          where: { token: { in: invalidTokens } },
        });
      }
    } catch (error) {
      this.logger.error(
        `Falha ao enviar push "${message.title}": ${(error as Error).message}`,
      );
    }
  }
}
