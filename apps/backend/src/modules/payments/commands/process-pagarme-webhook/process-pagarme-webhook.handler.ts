import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../../../prisma/prisma.service';
import { PaymentService } from '../../payment.service';
import { ProcessPagarmeWebhookCommand } from './process-pagarme-webhook.command';

@CommandHandler(ProcessPagarmeWebhookCommand)
export class ProcessPagarmeWebhookHandler
  implements ICommandHandler<ProcessPagarmeWebhookCommand>
{
  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PaymentService,
  ) {}

  async execute({ payload }: ProcessPagarmeWebhookCommand) {
    const chargeId = payload.data?.id ?? payload.data?.charge?.id;
    if (!chargeId || !/^ch_[a-zA-Z0-9]+$/.test(chargeId))
      throw new BadRequestException('Cobrança inválida');
    const payment = await this.prisma.payment.findUnique({
      where: { providerChargeId: chargeId },
    });
    // A notification is only a wake-up hint. No status, amount or customer data
    // from its public body is trusted. GET with our secret authenticates the resource.
    if (payment) await this.payments.reconcilePayment(payment.id);
    await this.prisma.paymentWebhookEvent.upsert({
      where: { id: payload.id },
      create: {
        id: payload.id,
        type: payload.type,
        paymentId: payment?.id,
        payload: { chargeId },
        processedAt: payment ? new Date() : null,
      },
      update: payment ? { paymentId: payment.id, processedAt: new Date() } : {},
    });
    // Unknown charges stay pending and are retried by the gateway. This also
    // recovers notifications arriving before the creation transaction commits.
    if (!payment)
      throw new ServiceUnavailableException(
        'Cobrança ainda não vinculada; reenviar evento',
      );
    return { received: true };
  }
}
