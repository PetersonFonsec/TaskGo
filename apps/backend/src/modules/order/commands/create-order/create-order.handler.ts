import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { createHash } from 'node:crypto';
import {
  OrderChannel,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../../../prisma/prisma.service';
import { ProviderService } from '../../../provider/provider.service';
import { NotificationService } from '../../../notification/notification.service';
import { CreateOrderCommand } from './create-order.command';

const BOOKING_TIMEZONE = 'America/Sao_Paulo';
const IDEMPOTENCY_KEY = /^[A-Za-z0-9-]{16,100}$/;
export const IDEMPOTENCY_KEY_PAYLOAD_MISMATCH =
  'IDEMPOTENCY_KEY_PAYLOAD_MISMATCH';
type Db = PrismaService | Prisma.TransactionClient;
type IntentPayload = {
  serviceId: string;
  scheduledFor?: string;
  addressId: string;
  paymentMethod?: PaymentMethod;
  channel?: OrderChannel;
};

@CommandHandler(CreateOrderCommand)
export class CreateOrderHandler implements ICommandHandler<CreateOrderCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly providerService: ProviderService,
    private readonly notifications: NotificationService,
  ) {}

  async execute({ payload, idempotencyKey }: CreateOrderCommand) {
    const {
      clientId,
      serviceId,
      scheduledFor,
      paymentMethod,
      addressId,
      channel,
    } = payload;
    if (
      !clientId ||
      !/^[1-9]\d*$/.test(serviceId) ||
      !addressId ||
      !scheduledFor
    )
      throw new BadRequestException(
        'serviceId, addressId and scheduledFor are required',
      );
    if (idempotencyKey !== undefined && !IDEMPOTENCY_KEY.test(idempotencyKey))
      throw new BadRequestException('Invalid Idempotency-Key');
    // Repetição de uma criação já concluída: devolve o pedido original antes de
    // qualquer validação de horário (o horário já está ocupado por ele mesmo).
    const replay = await this.findReplay(
      this.prisma,
      clientId,
      idempotencyKey,
      payload,
    );
    if (replay) return replay;
    if (paymentMethod && paymentMethod !== PaymentMethod.PIX)
      throw new BadRequestException('Only PIX is supported');
    const scheduledAt = new Date(scheduledFor);
    if (
      !Number.isFinite(scheduledAt.getTime()) ||
      scheduledAt.getTime() <= Date.now() ||
      scheduledAt.getTime() > Date.now() + 90 * 86400000
    )
      throw new BadRequestException('Choose a future scheduled slot');
    const fingerprint = idempotencyKey ? this.fingerprint(payload) : null;
    const transaction = this.prisma.$transaction(async (tx) => {
      const service = await tx.service.findUnique({
        where: { id: BigInt(serviceId) },
        include: {
          provider: {
            include: {
              serviceAreas: { where: { active: true } },
              user: { select: { id: true, email: true, name: true } },
            },
          },
        },
      });
      if (!service) throw new NotFoundException('Service not found');
      // All booking writers serialize on the provider, including bookings for different services.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(${service.providerId})::text`;
      // Com o lock: uma requisição concorrente com a mesma chave já terminou.
      const concurrent = await this.findReplay(
        tx,
        clientId,
        idempotencyKey,
        payload,
      );
      if (concurrent)
        return { order: concurrent, service, replayed: true as const };
      if (service.status !== 'ATIVO' || service.provider.status !== 'APPROVED')
        throw new BadRequestException('Service is not available');
      const address = await tx.address.findFirst({
        where: {
          id: BigInt(addressId),
          userId: BigInt(clientId),
          active: true,
        },
      });
      if (
        !address ||
        !address.street ||
        !address.city ||
        !address.state ||
        !address.cep ||
        address.lat === null ||
        address.lng === null ||
        !Number.isFinite(address.lat) ||
        !Number.isFinite(address.lng) ||
        Math.abs(address.lat) > 90 ||
        Math.abs(address.lng) > 180
      )
        throw new BadRequestException(
          'Select a complete active address belonging to the client',
        );
      const covered = service.provider.serviceAreas.some((area) => {
        if (
          area.mode !== 'RADIUS' ||
          area.centerLat === null ||
          area.centerLng === null ||
          !area.radiusKm ||
          address.lat === null ||
          address.lng === null
        )
          return false;
        const radians = (value: number) => (value * Math.PI) / 180;
        const latDelta = radians(address.lat - area.centerLat);
        const lngDelta = radians(address.lng - area.centerLng);
        const a =
          Math.sin(latDelta / 2) ** 2 +
          Math.cos(radians(area.centerLat)) *
            Math.cos(radians(address.lat)) *
            Math.sin(lngDelta / 2) ** 2;
        return (
          6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) <=
          Number(area.radiusKm)
        );
      });
      if (!covered)
        throw new BadRequestException(
          'Address is outside the provider service area',
        );
      const slot = await this.ensureSlotAvailable(service, scheduledAt, tx);
      const {
        street,
        number,
        complement,
        neighborhood,
        city,
        state,
        cep,
        lat,
        lng,
      } = address;
      const order = await tx.order.create({
        data: {
          clientId: BigInt(clientId),
          serviceId: service.id,
          status: OrderStatus.AGUARDANDO_APROVACAO,
          estimatedPrice: service.basePrice,
          finalPrice: service.basePrice,
          scheduledFor: scheduledAt,
          scheduledEnd: new Date(slot.endsAt),
          priceAdjusted: false,
          channel: channel ?? OrderChannel.WEB,
          idempotencyKey: idempotencyKey ?? null,
          idempotencyFingerprint: fingerprint,
          payment: {
            create: {
              method: paymentMethod || PaymentMethod.PIX,
              status: PaymentStatus.CREATED,
              amount: service.basePrice,
            },
          },
          addressSnap: {
            create: {
              street,
              number,
              complement,
              neighborhood,
              city,
              state,
              cep,
              lat,
              lng,
            },
          },
          orderTimeline: {
            create: {
              event: 'REQUESTED',
              createdBy: 'CLIENTE',
              createdAt: new Date(),
            },
          },
        },
        include: { payment: true, addressSnap: true },
      });
      return { order, service, replayed: false as const };
    });
    const result = await transaction.catch(async (error: unknown) => {
      // Mesma chave criada em paralelo sob o lock de outro prestador: o
      // índice único recusou a segunda; compara com o pedido que ficou.
      const replayed =
        idempotencyKey &&
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
          ? await this.findReplay(
              this.prisma,
              clientId,
              idempotencyKey,
              payload,
            )
          : null;
      if (!replayed) throw error;
      return { order: replayed, service: null, replayed: true as const };
    });
    if (result.replayed) return result.order;
    const { order, service } = result;

    // Após o commit: a entrega do e-mail não bloqueia nem desfaz a reserva.
    void this.notifications.notifyProviderNewOrder(service.provider.user, {
      id: order.id,
      serviceTitle: service.title,
      scheduledFor: order.scheduledFor,
    });
    return order;
  }

  /**
   * Pedido já criado por este cliente com esta chave. Só é uma repetição se a
   * intenção for a mesma (impressão digital igual); senão é 409 definitivo.
   */
  private async findReplay(
    db: Db,
    clientId: string,
    idempotencyKey: string | undefined,
    payload: IntentPayload,
  ) {
    if (!idempotencyKey) return null;
    const order = await db.order.findFirst({
      where: { clientId: BigInt(clientId), idempotencyKey },
      include: { payment: true, addressSnap: true },
    });
    if (!order) return null;
    // Sem impressão digital gravada não há como provar a mesma intenção.
    if (order.idempotencyFingerprint !== this.fingerprint(payload))
      throw new ConflictException({
        message: 'Idempotency-Key already used for a different order',
        errorCode: IDEMPOTENCY_KEY_PAYLOAD_MISMATCH,
      });
    return order;
  }

  /**
   * Identidade da intenção de criação, com os defaults reais aplicados:
   * pagamento omitido é PIX e canal omitido é WEB; o horário vale pelo
   * instante, não pela forma do ISO. finalPrice e o endereço avulso do DTO não
   * entram porque o handler os ignora (preço vem do serviço, endereço do
   * cadastro no momento da criação). clientId já delimita a chave.
   */
  private fingerprint(payload: IntentPayload) {
    const id = (value: string) =>
      /^\d+$/.test(value) ? BigInt(value).toString() : value;
    return createHash('sha256')
      .update(
        JSON.stringify([
          'order-intent-v1',
          id(payload.serviceId),
          new Date(payload.scheduledFor ?? '').getTime(),
          id(payload.addressId),
          payload.paymentMethod || PaymentMethod.PIX,
          payload.channel ?? OrderChannel.WEB,
        ]),
      )
      .digest('hex');
  }

  private async ensureSlotAvailable(
    service: { id: bigint; providerId: bigint },
    scheduledAt: Date,
    tx: import('@prisma/client').Prisma.TransactionClient,
  ) {
    const bookingDate = this.formatBookingDate(scheduledAt);
    const availability = await this.providerService.getAvailability(
      service.providerId.toString(),
      {
        from: bookingDate,
        to: bookingDate,
        serviceId: service.id.toString(),
      },
      tx,
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
    return slot;
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
