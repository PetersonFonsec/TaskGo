import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { gatewayPaymentStatus, paidStatuses } from '../../payment-state';
import { ConfigService } from '@nestjs/config';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  UserType,
} from '@prisma/client';

import { PrismaService } from '../../../../prisma/prisma.service';
import { toPaymentResponse } from '../../mappers/payment-response.mapper';
import { PagarmeService } from '../../pagarme.service';
import { CreateOrderPaymentCommand } from './create-order-payment.command';

@CommandHandler(CreateOrderPaymentCommand)
export class CreateOrderPaymentHandler
  implements ICommandHandler<CreateOrderPaymentCommand>
{
  constructor(
    private readonly prisma: PrismaService,
    private readonly pagarme: PagarmeService,
    private readonly configService: ConfigService,
  ) {}

  async execute({ orderId, clientId, payload }: CreateOrderPaymentCommand) {
    this.validateMethod(payload);
    const order = await this.findPayableOrder(orderId, clientId);

    if (order.payment && order.payment.status !== PaymentStatus.CREATED) {
      if (order.payment.method !== payload.method)
        throw new ConflictException(
          'Troca de método exige conciliação da cobrança anterior',
        );
      if (
        order.payment.pixExpiresAt &&
        order.payment.pixExpiresAt <= new Date() &&
        !paidStatuses.includes(order.payment.status)
      )
        throw new ConflictException(
          'PIX expirado. Solicite conciliação antes de gerar nova cobrança',
        );
      return toPaymentResponse(order.payment);
    }

    const feePct = await this.resolveFeePercentage(order.service);
    const amount = Number(order.finalPrice ?? order.service.basePrice);
    const amountCents = Math.round(amount * 100);
    const platformAmountCents = Math.round(amountCents * feePct);
    const providerAmountCents = amountCents - platformAmountCents;
    if (!Number.isSafeInteger(amountCents) || amountCents <= 0)
      throw new BadRequestException('Valor do pedido inválido');
    if (
      !this.pagarme.simulated &&
      !this.configService.get<string>('payment.platformRecipientId')
    )
      throw new BadRequestException('Recebedor da plataforma não configurado');
    const gatewayInput = {
      idempotencyKey: randomUUID(),
      orderId,
      amountCents,
      platformAmountCents,
      providerAmountCents,
      providerRecipientId:
        order.service.provider.payoutProfile!.pagarmeRecipientId!,
      platformRecipientId: this.configService.get<string>(
        'payment.platformRecipientId',
      ),
      customer: order.client,
      card: payload.card ?? undefined,
    };
    // Persist an immutable request and key before the first network call. Concurrent
    // retries use exactly this request. Never retry beyond the shortest gateway TTL.
    const attempt = await this.prisma.$transaction(async (tx) => {
      if (order.payment)
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(${order.payment.id})::text`;
      const currentPayment = await tx.payment.findUnique({
        where: { orderId },
      });
      if (currentPayment && currentPayment.status !== PaymentStatus.CREATED)
        throw new ConflictException(
          'Pagamento já iniciado; consulte seu estado',
        );
      const current = await tx.order.findUniqueOrThrow({
        where: { id: orderId },
      });
      if (
        ![OrderStatus.AGENDADO, OrderStatus.AGUARDANDO_PAGAMENTO].includes(
          current.status as any,
        )
      )
        throw new ConflictException('Pedido não disponível para pagamento');
      return tx.paymentAttempt.upsert({
        where: { orderId },
        create: {
          orderId,
          method: payload.method,
          idempotencyKey: gatewayInput.idempotencyKey,
          request: JSON.parse(
            JSON.stringify({ ...gatewayInput, orderId: orderId.toString() }),
          ),
        },
        update: {},
      });
    });
    if (
      attempt.method !== payload.method ||
      Date.now() - attempt.createdAt.getTime() > 4 * 60 * 1000
    )
      throw new ConflictException(
        'Tentativa pendente de conciliação. Não crie outra cobrança',
      );
    const stored = attempt.request as any;
    const gateway = await this.pagarme.createPixPayment({
      ...stored,
      orderId,
      idempotencyKey: attempt.idempotencyKey,
    });
    if (!gateway.chargeId || !gateway.orderId)
      throw new ConflictException(
        'Resposta incompleta; pagamento pendente de conciliação',
      );
    const now = new Date();
    const status = gatewayPaymentStatus(gateway.status);

    const payment = await this.prisma.$transaction(async (tx) => {
      if (order.payment)
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(${order.payment.id})::text`;
      const existing = await tx.payment.findUnique({ where: { orderId } });
      if (existing && existing.status !== PaymentStatus.CREATED)
        return existing;
      const data = {
        method: payload.method,
        status,
        amount: stored.amountCents / 100,
        feePct: stored.platformAmountCents / stored.amountCents,
        platformAmount: stored.platformAmountCents / 100,
        providerAmount: stored.providerAmountCents / 100,
        providerOrderId: gateway.orderId,
        providerChargeId: gateway.chargeId,
        pixQrCode: gateway.qrCode,
        pixQrCodeBase64: gateway.qrCodeBase64,
        pixExpiresAt: gateway.expiresAt,
        authorizedAt: status === PaymentStatus.AUTORIZADO ? now : null,
        failureReason: null,
        rawProviderResponse: gateway.raw as Prisma.InputJsonValue,
      };
      const saved = await tx.payment.upsert({
        where: { orderId },
        create: { orderId, ...data },
        update: data,
      });
      if (status === PaymentStatus.AUTORIZADO) {
        await tx.orderTimeline.create({
          data: {
            orderId,
            event: 'PAYMENT_AUTHORIZED',
            description: 'Pagamento autorizado.',
            createdBy: UserType.CLIENTE,
            createdAt: now,
          },
        });
      }
      if (paidStatuses.includes(status))
        await tx.order.updateMany({
          where: { id: orderId, status: OrderStatus.AGUARDANDO_PAGAMENTO },
          data: { status: OrderStatus.AGENDADO },
        });
      return saved;
    });
    return toPaymentResponse(payment);
  }

  private validateMethod(payload: CreateOrderPaymentCommand['payload']) {
    if (payload.method !== PaymentMethod.PIX || payload.card) {
      throw new BadRequestException(
        'Somente PIX está disponível; não envie dados de cartão',
      );
    }
  }

  private async findPayableOrder(orderId: bigint, clientId: bigint) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        clientId: true,
        status: true,
        finalPrice: true,
        client: { select: { name: true, email: true, cpf: true } },
        payment: true,
        service: {
          select: {
            basePrice: true,
            platformFeePct: true,
            category: true,
            provider: { select: { payoutProfile: true } },
          },
        },
      },
    });
    if (!order) throw new NotFoundException('Pedido não encontrado');
    if (order.clientId !== clientId) {
      throw new ForbiddenException(
        'Apenas o cliente deste pedido pode iniciar o pagamento',
      );
    }
    const payableStatuses: OrderStatus[] = [
      OrderStatus.AGENDADO,
      OrderStatus.AGUARDANDO_PAGAMENTO,
    ];
    if (!payableStatuses.includes(order.status)) {
      throw new BadRequestException(
        'Este pedido não está disponível para pagamento',
      );
    }
    if (
      !order.service.provider.payoutProfile?.pagarmeRecipientId ||
      order.service.provider.payoutProfile.syncStatus !== 'READY' ||
      order.service.provider.payoutProfile.bankAccountStatus !== 'CONFIRMED'
    ) {
      throw new BadRequestException(
        'Prestador ainda não está habilitado para receber pagamentos',
      );
    }
    return order;
  }

  private async resolveFeePercentage(service: {
    category: string;
    platformFeePct: Prisma.Decimal | null;
  }) {
    const category =
      service.platformFeePct === null
        ? await this.prisma.category.findFirst({
            where: {
              OR: [{ slug: service.category }, { name: service.category }],
            },
            select: { platformFeePct: true },
          })
        : null;
    const feePct = Number(
      service.platformFeePct ??
        category?.platformFeePct ??
        this.configService.getOrThrow<number>('payment.defaultPlatformFeePct'),
    );
    if (!Number.isFinite(feePct) || feePct < 0 || feePct > 1) {
      throw new BadRequestException('Taxa da plataforma inválida');
    }
    return feePct;
  }

  private isReusable(status: PaymentStatus) {
    const reusable: PaymentStatus[] = [
      PaymentStatus.PENDENTE,
      PaymentStatus.AUTORIZADO,
      PaymentStatus.PAGO,
    ];
    return reusable.includes(status);
  }
}
