import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
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

    if (
      order.payment?.method === payload.method &&
      this.isReusable(order.payment.status)
    ) {
      return toPaymentResponse(order.payment);
    }

    const feePct = await this.resolveFeePercentage(order.service);
    const amount = Number(order.finalPrice ?? order.service.basePrice);
    const amountCents = Math.round(amount * 100);
    const platformAmountCents = Math.round(amountCents * feePct);
    const providerAmountCents = amountCents - platformAmountCents;
    const gatewayInput = {
      orderId,
      amountCents,
      platformAmountCents,
      providerAmountCents,
      providerRecipientId: order.service.provider.pagarmeRecipientId!,
      platformRecipientId: this.configService.get<string>(
        'payment.platformRecipientId',
      ),
      customer: order.client,
      card: payload.card ?? undefined,
    };
    const gateway =
      payload.method === PaymentMethod.PIX
        ? await this.pagarme.createPixPayment(gatewayInput)
        : await this.pagarme.authorizeCardPayment(gatewayInput);
    const now = new Date();
    const status =
      payload.method === PaymentMethod.PIX
        ? PaymentStatus.PENDENTE
        : PaymentStatus.AUTORIZADO;

    const payment = await this.prisma.$transaction(async (tx) => {
      const data = {
        method: payload.method,
        status,
        amount,
        feePct,
        platformAmount: platformAmountCents / 100,
        providerAmount: providerAmountCents / 100,
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
      await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.AGENDADO },
      });
      return saved;
    });
    return toPaymentResponse(payment);
  }

  private validateMethod(payload: CreateOrderPaymentCommand['payload']) {
    if (payload.method === PaymentMethod.CARTAO && !payload.card) {
      throw new BadRequestException('Informe os dados do cartão');
    }
    if (payload.method === PaymentMethod.PIX && payload.card) {
      throw new BadRequestException(
        'Não envie dados de cartão para pagamento PIX',
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
            provider: { select: { pagarmeRecipientId: true } },
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
    if (!order.service.provider.pagarmeRecipientId) {
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
