import { Logger } from '@nestjs/common';

import {
  PushDeliveryResult,
  PushMessage,
  PushTransport,
} from './push-transport';

/** Usado sem FCM configurado: registra o aviso para testes locais. */
export class LogPushTransport extends PushTransport {
  private readonly logger = new Logger(LogPushTransport.name);

  async send(
    tokens: string[],
    _message: PushMessage,
  ): Promise<PushDeliveryResult> {
    this.logger.log(
      `Push para ${tokens.length} aparelho(s) sem transporte FCM`,
    );
    return { invalidTokens: [] };
  }
}
