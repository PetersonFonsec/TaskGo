import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';

import { PrismaService } from '../../../../prisma/prisma.service';
import { ProviderService } from '../../../provider/provider.service';
import { CreateOrderCommand } from './create-order.command';

const BOOKING_TIMEZONE = 'America/Sao_Paulo';

@CommandHandler(CreateOrderCommand)
export class CreateOrderHandler implements ICommandHandler<CreateOrderCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly providerService: ProviderService,
  ) {}

  async execute({ payload }: CreateOrderCommand) {
    const {
      clientId,
      serviceId,
      scheduledFor,
      finalPrice,
      paymentMethod,
      address,
    } = payload;
    if (!clientId || !serviceId) {
      throw new BadRequestException('clientId and serviceId are required');
    }

    const service = await this.prisma.service.findUnique({
      where: { id: BigInt(serviceId) },
    });
    if (!service) throw new NotFoundException('Service not found');
    if (service.status !== 'ATIVO')
      throw new BadRequestException('Service is not available');

    const scheduledAt = scheduledFor ? new Date(scheduledFor) : undefined;
    if (scheduledFor && Number.isNaN(scheduledAt?.getTime())) {
      throw new BadRequestException('Invalid scheduledFor');
    }
    if (scheduledAt) await this.ensureSlotAvailable(service, scheduledAt);

    const price = finalPrice ?? service.basePrice;
    return this.prisma.$transaction((tx) =>
      tx.order.create({
        data: {
          clientId: BigInt(clientId),
          serviceId: BigInt(serviceId),
          status: OrderStatus.AGUARDANDO_APROVACAO,
          finalPrice: price,
          scheduledFor: scheduledAt,
          priceAdjusted: false,
          payment: {
            create: {
              method: (paymentMethod || 'PIX') as PaymentMethod,
              status: PaymentStatus.CREATED,
              amount: price,
            },
          },
          addressSnap: address ? { create: address } : undefined,
        },
        include: { payment: true, addressSnap: true },
      }),
    );
  }

  private async ensureSlotAvailable(
    service: { id: bigint; providerId: bigint },
    scheduledAt: Date,
  ) {
    const bookingDate = this.formatBookingDate(scheduledAt);
    const availability = await this.providerService.getAvailability(
      service.providerId.toString(),
      {
        from: bookingDate,
        to: bookingDate,
        serviceId: service.id.toString(),
      },
    );
    const requestedTime = scheduledAt.getTime();
    const slot = availability.days
      .flatMap((day) => day.slots)
      .find(
        (candidate) =>
          candidate.available &&
          candidate.serviceId === service.id.toString() &&
          new Date(candidate.startsAt).getTime() === requestedTime,
      );
    if (!slot)
      throw new BadRequestException(
        'Selected scheduled slot is no longer available',
      );
  }

  private formatBookingDate(date: Date) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: BOOKING_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const values = Object.fromEntries(
      parts
        .filter(({ type }) => type !== 'literal')
        .map(({ type, value }) => [type, value]),
    );
    return `${values.year}-${values.month}-${values.day}`;
  }
}
