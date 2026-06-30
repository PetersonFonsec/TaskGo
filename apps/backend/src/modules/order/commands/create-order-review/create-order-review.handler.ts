import { ConflictException, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { OrderStatus, Prisma, UserType } from '@prisma/client';

import { PrismaService } from '../../../../prisma/prisma.service';
import { CreateOrderReviewCommand } from './create-order-review.command';

@CommandHandler(CreateOrderReviewCommand)
export class CreateOrderReviewHandler implements ICommandHandler<CreateOrderReviewCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute({ orderId, clientId, payload }: CreateOrderReviewCommand) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        clientId: true,
        status: true,
        review: { select: { id: true } },
        service: { select: { providerId: true } },
      },
    });

    if (!order) throw new NotFoundException(`Pedido ${orderId.toString()} não encontrado`);
    if (order.clientId !== clientId) throw new ForbiddenException('Apenas o cliente deste pedido pode avaliar o prestador');
    if (order.status !== OrderStatus.CONCLUIDO) throw new BadRequestException('Somente pedidos concluídos podem ser avaliados');
    if (order.review) throw new ConflictException('Este pedido já possui uma avaliação');

    try {
      return await this.prisma.$transaction(async (prisma) => {
        const review = await prisma.avaliacao.create({
          data: {
            orderId,
            clientId,
            providerId: order.service.providerId,
            rating: payload.rating,
            comment: payload.comment?.trim() || null,
          },
          select: { id: true, rating: true, comment: true, reviewedAt: true },
        });

        const reputation = await prisma.avaliacao.aggregate({
          where: { providerId: order.service.providerId },
          _avg: { rating: true },
          _count: { rating: true },
        });
        const provider = await prisma.provider.update({
          where: { id: order.service.providerId },
          data: {
            ratingAvg: reputation._avg.rating ?? payload.rating,
            ratingCount: reputation._count.rating,
          },
          select: { ratingAvg: true, ratingCount: true },
        });
        await prisma.orderTimeline.create({
          data: {
            orderId,
            event: 'CLIENT_REVIEWED',
            description: 'Cliente avaliou o atendimento.',
            createdBy: UserType.CLIENTE,
            createdAt: review.reviewedAt,
          },
        });

        // TODO(notification): notify provider: "Você recebeu uma nova avaliação."
        return {
          id: review.id.toString(),
          rating: review.rating,
          comment: review.comment,
          reviewedAt: review.reviewedAt,
          providerRatingAvg: Number(provider.ratingAvg ?? 0),
          providerRatingCount: provider.ratingCount,
        };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Este pedido já possui uma avaliação');
      }
      throw error;
    }
  }
}
