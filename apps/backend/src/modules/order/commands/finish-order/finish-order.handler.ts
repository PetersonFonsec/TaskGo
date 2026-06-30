import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { OrderStatus, UserType } from '@prisma/client';

import { PrismaService } from '../../../../prisma/prisma.service';
import { FinishOrderCommand } from './finish-order.command';

@CommandHandler(FinishOrderCommand)
export class FinishOrderHandler implements ICommandHandler<FinishOrderCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute({ orderId, providerId, payload }: FinishOrderCommand) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        status: true,
        estimatedPrice: true,
        service: { select: { basePrice: true, providerId: true } },
      },
    });

    if (!order) throw new NotFoundException(`Pedido ${orderId.toString()} não encontrado`);
    if (order.service.providerId !== providerId) {
      throw new ForbiddenException('Apenas o prestador responsável pode finalizar este pedido');
    }
    if (order.status !== OrderStatus.EM_ANDAMENTO) {
      throw new BadRequestException('Somente pedidos em andamento podem ser finalizados');
    }

    const estimatedPrice = Number(order.estimatedPrice ?? order.service.basePrice);
    const priceAdjusted = Math.abs(payload.finalPrice - estimatedPrice) > 0.009;
    const reason = payload.priceAdjustmentReason?.trim();
    if (priceAdjusted && !reason) {
      throw new BadRequestException('Informe a justificativa da alteração de preço');
    }
    if ((payload.photos?.length ?? 0) > 5) {
      throw new BadRequestException('É permitido enviar no máximo 5 fotos');
    }

    const finishedAt = new Date();
    const updated = await this.prisma.$transaction(async (prisma) => {
      const result = await prisma.order.update({
        where: { id: orderId },
        data: {
          finalPrice: payload.finalPrice,
          priceAdjusted,
          priceAdjustmentReason: priceAdjusted ? reason : null,
          providerFinishedAt: finishedAt,
          status: OrderStatus.AGUARDANDO_CONFIRMACAO_CLIENTE,
        },
        select: { id: true, status: true, finalPrice: true, providerFinishedAt: true },
      });

      await prisma.orderCompletion.upsert({
        where: { orderId },
        create: { orderId, completedByProviderAt: finishedAt, providerNotes: payload.providerNotes?.trim() || null },
        update: { completedByProviderAt: finishedAt, providerNotes: payload.providerNotes?.trim() || null },
      });
      await prisma.orderTimeline.create({
        data: {
          orderId,
          event: 'SERVICE_FINISHED',
          description: 'Prestador informou a conclusão do serviço.',
          createdBy: UserType.PRESTADOR,
          createdAt: finishedAt,
        },
      });
      if (payload.photos?.length) {
        await prisma.orderPhoto.createMany({
          data: payload.photos.map((photo) => ({ orderId, uploadedBy: UserType.PRESTADOR, url: photo.url, type: photo.type, createdAt: finishedAt })),
        });
      }
      return result;
    });

    return {
      id: updated.id.toString(),
      status: updated.status,
      finalPrice: Number(updated.finalPrice),
      providerFinishedAt: updated.providerFinishedAt,
      message: 'Conclusão enviada para o cliente confirmar.',
    };
  }
}
