import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { OrderEventType, OrderStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../../../../prisma/prisma.service';
import {
  resolvePlatformFeePct,
  splitPlatformFee,
} from '../../../payments/platform-fee';
import { CANCELLATION_REASON_LABELS } from '../../cancellation-reasons';
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async execute({ id, viewer }: GetOrderDetailsQuery) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        requestedAt: true,
        scheduledFor: true,
        scheduledEnd: true,
        estimatedPrice: true,
        finalPrice: true,
        priceAdjustmentReason: true,
        providerFinishedAt: true,
        cancellationReason: true,
        cancellationNote: true,
        client: { select: { id: true, name: true, photoUrl: true } },
        service: {
          select: {
            id: true,
            title: true,
            category: true,
            basePrice: true,
            platformFeePct: true,
            provider: {
              select: {
                id: true,
                ratingAvg: true,
                ratingCount: true,
                verified: true,
                user: { select: { name: true, photoUrl: true } },
                serviceAreas: {
                  where: {
                    active: true,
                    mode: 'RADIUS',
                    centerLat: { not: null },
                    centerLng: { not: null },
                  },
                  select: { centerLat: true, centerLng: true },
                  orderBy: { createdAt: 'asc' },
                  take: 1,
                },
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
            lat: true,
            lng: true,
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
    const isProvider = viewer === 'PRESTADOR';
    const {
      lat = null,
      lng = null,
      ...address
    } = order.addressSnap ?? {
      street: null,
      number: null,
      complement: null,
      neighborhood: null,
      city: null,
      state: null,
      cep: null,
    };
    const serviceAmount =
      order.finalPrice === null ? estimatedAmount : Number(order.finalPrice);
    const canceledAt = order.orderTimeline.find(
      (event) => event.event === 'CANCELED',
    )?.createdAt;

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
        scheduledEnd: order.scheduledEnd,
      },
      address: order.addressSnap ? address : null,
      distanceKm: isProvider
        ? this.distanceKm(order.service.provider.serviceAreas[0], lat, lng)
        : null,
      providerEarnings: isProvider
        ? await this.providerEarnings(order.service, serviceAmount)
        : null,
      cancellation:
        order.status === OrderStatus.CANCELADO && order.cancellationReason
          ? {
              reason: order.cancellationReason,
              label: CANCELLATION_REASON_LABELS[order.cancellationReason],
              note: order.cancellationNote,
              canceledAt: canceledAt ?? null,
            }
          : null,
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

  private async providerEarnings(
    service: {
      category: string;
      platformFeePct: Prisma.Decimal | null;
    },
    amount: number,
  ) {
    const feePct = await resolvePlatformFeePct(
      this.prisma,
      service,
      this.configService.getOrThrow<number>('payment.defaultPlatformFeePct'),
    );
    const split = splitPlatformFee(amount, feePct);
    return {
      grossAmount: split.amountCents / 100,
      feePct,
      feeAmount: split.platformAmountCents / 100,
      netAmount: split.providerAmountCents / 100,
    };
  }

  private distanceKm(
    origin: { centerLat: number | null; centerLng: number | null } | undefined,
    lat: number | null | undefined,
    lng: number | null | undefined,
  ) {
    if (
      origin?.centerLat == null ||
      origin.centerLng == null ||
      lat == null ||
      lng == null
    )
      return null;
    const toRad = (value: number) => (value * Math.PI) / 180;
    const dLat = toRad(lat - origin.centerLat);
    const dLng = toRad(lng - origin.centerLng);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(origin.centerLat)) *
        Math.cos(toRad(lat)) *
        Math.sin(dLng / 2) ** 2;
    const km = 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, a)));
    return Math.round(km * 10) / 10;
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
