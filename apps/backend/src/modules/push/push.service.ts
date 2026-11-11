import { Injectable, Logger } from '@nestjs/common';
import { DevicePlatform } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
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
   */
  async registerDevice(
    userId: bigint,
    token: string,
    platform: DevicePlatform,
    sessionFamilyId: string | null = null,
  ): Promise<void> {
    await this.prisma.deviceToken.upsert({
      where: { token },
      create: { userId, token, platform, sessionFamilyId },
      update: { userId, platform, sessionFamilyId, lastSeenAt: new Date() },
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

  /** Nunca rejeita: o push complementa o e-mail e não pode travar o pedido. */
  async sendToUser(userId: bigint, message: PushMessage): Promise<void> {
    try {
      const devices = await this.prisma.deviceToken.findMany({
        where: { userId },
        select: { token: true },
      });
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
