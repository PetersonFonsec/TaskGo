import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { OrderStatus, PaymentStatus, UserType } from '@prisma/client';

import { PrismaService } from '../../../../prisma/prisma.service';
import { PaymentService } from '../../payment/payment.service';
import { ConfirmOrderCompletionCommand } from './confirm-order-completion.command';

@CommandHandler(ConfirmOrderCompletionCommand)
export class ConfirmOrderCompletionHandler implements ICommandHandler<ConfirmOrderCompletionCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentService: PaymentService,
  ) {}

  async execute({ orderId, clientId, payload }: ConfirmOrderCompletionCommand) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        clientId: true,
        status: true,
        providerFinishedAt: true,
        finalPrice: true,
        payment: { select: { id: true, status: true, providerChargeId: true } },
      },
    });

    if (!order) throw new NotFoundException(`Pedido ${orderId.toString()} não encontrado`);
    if (order.clientId !== clientId) throw new ForbiddenException('Apenas o cliente deste pedido pode confirmar a conclusão');
    if (order.status === OrderStatus.CONCLUIDO) throw new BadRequestException('Este serviço já foi confirmado');
    if (order.status !== OrderStatus.AGUARDANDO_CONFIRMACAO_CLIENTE) {
      throw new BadRequestException('Este pedido não está aguardando confirmação');
    }
    if (!order.providerFinishedAt) throw new BadRequestException('O prestador ainda não informou a conclusão');
    if (order.finalPrice === null) throw new BadRequestException('O pedido não possui valor final');
    if (!order.payment) throw new BadRequestException('Pagamento do pedido não encontrado');

    // Capture first. If the gateway rejects, no order state is changed.
    const capture = await this.paymentService.capturePayment(order.payment);
    const confirmedAt = new Date();

    const response = await this.prisma.$transaction(async (prisma) => {
      const changed = await prisma.order.updateMany({
        where: { id: orderId, clientId, status: OrderStatus.AGUARDANDO_CONFIRMACAO_CLIENTE },
        data: { clientConfirmedAt: confirmedAt, status: OrderStatus.CONCLUIDO },
      });
      if (changed.count !== 1) throw new BadRequestException('Este pedido já foi confirmado');

      await prisma.orderCompletion.upsert({
        where: { orderId },
        create: { orderId, confirmedByClientAt: confirmedAt, clientNotes: payload.clientNotes?.trim() || null },
        update: { confirmedByClientAt: confirmedAt, clientNotes: payload.clientNotes?.trim() || null },
      });
      const payment = await prisma.payment.update({
        where: { id: order.payment!.id },
        data: { status: PaymentStatus.CAPTURED, paidAt: capture.capturedAt },
        select: { status: true, paidAt: true },
      });
      await prisma.orderTimeline.createMany({
        data: [
          { orderId, event: 'CLIENT_CONFIRMED', description: 'Cliente confirmou a conclusão do serviço.', createdBy: UserType.CLIENTE, createdAt: confirmedAt },
          { orderId, event: 'PAYMENT_CAPTURED', description: 'Pagamento capturado com sucesso.', createdBy: UserType.CLIENTE, createdAt: capture.capturedAt },
        ],
      });
      return payment;
    });

    // TODO(notification): notify the provider when notification infrastructure is available.
    return {
      id: orderId.toString(),
      status: OrderStatus.CONCLUIDO,
      clientConfirmedAt: confirmedAt,
      payment: response,
      message: 'Serviço confirmado com sucesso.',
    };
  }
}
