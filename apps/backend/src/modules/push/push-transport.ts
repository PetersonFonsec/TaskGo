export interface PushMessage {
  title: string;
  body: string;
  /** Pares chave-valor entregues ao app para abrir a tela certa. */
  data?: Record<string, string>;
}

export interface PushDeliveryResult {
  /** Tokens que o provedor declarou inválidos ou desinstalados. */
  invalidTokens: string[];
}

/**
 * Canal de entrega de push. O PushModule escolhe a implementação conforme a
 * configuração do Firebase Cloud Messaging.
 */
export abstract class PushTransport {
  abstract send(
    tokens: string[],
    message: PushMessage,
  ): Promise<PushDeliveryResult>;
}
