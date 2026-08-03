import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PaymentStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../../../../prisma/prisma.service';
import { ProcessPagarmeWebhookCommand } from './process-pagarme-webhook.command';

const PAYMENT_STATUS_BY_EVENT: Partial<Record<string, PaymentStatus>> = {
  'charge.paid': PaymentStatus.PAGO,
  'charge.payment_failed': PaymentStatus.FALHOU,
  'charge.canceled': PaymentStatus.CANCELADO,
  'charge.refunded': PaymentStatus.REEMBOLSADO,
};

@CommandHandler(ProcessPagarmeWebhookCommand)
export class ProcessPagarmeWebhookHandler
  implements ICommandHandler<ProcessPagarmeWebhookCommand>
{
  constructor(private readonly prisma: PrismaService) {}

  async execute({ payload }: ProcessPagarmeWebhookCommand) {
    const existing = await this.prisma.paymentWebhookEvent.findUnique({
      where: { id: payload.id },
      select: { id: true },
    });
    if (existing) return { received: true };

    const chargeId = payload.data?.id ?? payload.data?.charge?.id;
    const payment = chargeId
      ? await this.prisma.payment.findUnique({
          where: { providerChargeId: chargeId },
        })
      : null;
    const status = PAYMENT_STATUS_BY_EVENT[payload.type];

    await this.prisma
      .$transaction(async (tx) => {
        await tx.paymentWebhookEvent.create({
          data: {
            id: payload.id,
            paymentId: payment?.id,
            type: payload.type,
            payload: payload as unknown as Prisma.InputJsonValue,
          },
        });
        if (!payment || !status) return;

        const now = new Date();
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status,
            paidAt: status === PaymentStatus.PAGO ? now : payment.paidAt,
            capturedAt:
              status === PaymentStatus.PAGO ? now : payment.capturedAt,
            canceledAt:
              status === PaymentStatus.CANCELADO ? now : payment.canceledAt,
            refundedAt:
              status === PaymentStatus.REEMBOLSADO ? now : payment.refundedAt,
            failureReason:
              status === PaymentStatus.FALHOU
                ? (payload.data?.last_transaction?.gateway_response?.errors?.[0]
                    ?.message ?? 'Pagamento recusado')
                : null,
            rawProviderResponse: payload as unknown as Prisma.InputJsonValue,
          },
        });
      })
      .catch((error: unknown) => {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
          throw error;
        }
        if (error.code !== 'P2002') throw error;
      });
    return { received: true };
  }
}
