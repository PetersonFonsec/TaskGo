export interface EmailMessage {
  to: string;
  subject: string;
  /** Versão em texto puro: sempre enviada, para clientes de e-mail sem HTML. */
  text: string;
  /** Versão HTML gerada por `renderEmail`. */
  html?: string;
  /**
   * Chave para o provedor descartar reenvios do mesmo e-mail (ex.: retentativa
   * após timeout). Use algo estável por evento, como `order-accepted/42`.
   */
  idempotencyKey?: string;
  /** Categoria do e-mail, usada como tag no provedor para filtrar métricas. */
  category?: string;
}

/**
 * Canal de entrega de e-mails. A implementação é escolhida pelo EmailModule:
 * Resend quando RESEND_API_KEY está definida, SMTP como alternativa e, sem
 * nenhum dos dois, apenas registro no log.
 */
export abstract class EmailTransport {
  /** Falso quando os e-mails só vão para o log (nenhum provedor configurado). */
  abstract readonly configured: boolean;
  abstract send(message: EmailMessage): Promise<void>;
}
