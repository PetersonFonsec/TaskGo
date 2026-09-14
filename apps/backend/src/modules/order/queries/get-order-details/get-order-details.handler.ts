import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { OrderEventType } from '@prisma/client';

import { PrismaService } from '../../../../prisma/prisma.service';
import { GetOrderDetailsQuery } from './get-order-details.query';

const EVENT_COPY: Record<
  OrderEventType,
  { title: string; description?: string }
> = {
  REQUESTED: {
    title: 'Solicitação enviada',
    description: 'O cliente solicitou o atendimento.',
  },
  ACCEPTED: {
    title: 'Prestador aceitou',
    description: 'O atendimento foi confirmado pelo prestador.',
  },
  PAYMENT_AUTHORIZED: { title: 'Pagamento autorizado' },
  PROVIDER_ON_THE_WAY: { title: 'Prestador a caminho' },
  SERVICE_STARTED: { title: 'Serviço iniciado' },
  PRICE_UPDATED: { title: 'Valor do serviço atualizado' },
  SERVICE_FINISHED: {
    title: 'Serviço finalizado',
    description: 'Aguardando a confirmação do cliente.',
  },
  CLIENT_CONFIRMED: { title: 'Cliente confirmou' },
  PAYMENT_CAPTURED: { title: 'Pagamento confirmado' },
  PAYMENT_RELEASED: { title: 'Pagamento liberado' },
  CANCELED: { title: 'Pedido cancelado' },
  CLIENT_REVIEWED: { title: 'Atendimento avaliado' },
};

@QueryHandler(GetOrderDetailsQuery)
export class GetOrderDetailsHandler
  implements IQueryHandler<GetOrderDetailsQuery>
{
  constructor(private readonly prisma: PrismaService) {}

  async execute({ id }: GetOrderDetailsQuery) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        requestedAt: true,
        scheduledFor: true,
        estimatedPrice: true,
        finalPrice: true,
        priceAdjustmentReason: true,
        providerFinishedAt: true,
        client: { select: { id: true, name: true, photoUrl: true } },
        service: {
          select: {
            id: true,
            title: true,
            category: true,
            basePrice: true,
            provider: {
              select: {
                id: true,
                ratingAvg: true,
                ratingCount: true,
                verified: true,
                user: { select: { name: true, photoUrl: true } },
              },
            },
          },
        },
        addressSnap: {
          select: {
            street: true,
            number: true,
            complement: true,
            neighborhood: true,
            city: true,
            state: true,
            cep: true,
          },
        },
        payment: {
          select: { method: true, status: true, amount: true, paidAt: true },
        },
        review: {
          select: { id: true, rating: true, comment: true, reviewedAt: true },
        },
        completion: {
          select: { providerNotes: true, completedByProviderAt: true },
        },
        orderPhoto: {
          select: { id: true, url: true, type: true },
          orderBy: { createdAt: 'asc' },
        },
        orderTimeline: {
          select: { event: true, description: true, createdAt: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!order)
      throw new NotFoundException(`Pedido ${id.toString()} não encontrado`);

    const provider = order.service.provider;
    const estimatedAmount = Number(
      order.estimatedPrice ?? order.service.basePrice,
    );
    const timeline = order.orderTimeline.map((event) =>
      this.toTimelineEvent(event),
    );

    return {
      id: order.id.toString(),
      status: order.status,
      service: {
        id: order.service.id.toString(),
        title: order.service.title,
        category: order.service.category,
        estimatedPrice: estimatedAmount,
      },
      provider: {
        id: provider.id.toString(),
        name: provider.user.name,
        photoUrl: provider.user.photoUrl,
        ratingAvg: Number(provider.ratingAvg ?? 0),
        ratingCount: provider.ratingCount,
        verified: provider.verified,
      },
      client: { ...order.client, id: order.client.id.toString() },
      schedule: {
        requestedAt: order.requestedAt,
        scheduledFor: order.scheduledFor,
      },
      address: order.addressSnap,
      payment: order.payment
        ? {
            method: order.payment.method,
            status: order.payment.status,
            estimatedAmount,
            finalAmount:
              order.finalPrice === null ? null : Number(order.finalPrice),
          }
        : null,
      review: order.review
        ? { ...order.review, id: order.review.id.toString() }
        : null,
      completion: {
        providerFinishedAt:
          order.completion?.completedByProviderAt ?? order.providerFinishedAt,
        providerNotes: order.completion?.providerNotes ?? null,
      },
      priceAdjustmentReason: order.priceAdjustmentReason,
      photos: order.orderPhoto.map((photo) => ({
        ...photo,
        id: photo.id.toString(),
      })),
      timeline,
    };
  }

  private toTimelineEvent(event: {
    event: OrderEventType;
    description: string | null;
    createdAt: Date;
  }) {
    const copy = EVENT_COPY[event.event];
    return {
      type: event.event,
      title: copy.title,
      description: event.description ?? copy.description,
      date: event.createdAt,
      completed: true,
    };
  }
}
