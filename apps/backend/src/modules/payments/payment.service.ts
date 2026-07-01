import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, PaymentMethod, PaymentStatus, Prisma, UserType } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrderPaymentDto } from './dto/create-order-payment.dto';
import { PagarmeWebhookDto } from './dto/pagarme-webhook.dto';
import { PagarmeService } from './pagarme.service';

@Injectable()
export class PaymentService {
  constructor(private readonly prisma: PrismaService, private readonly pagarme: PagarmeService) {}

  async createOrderPayment(orderId: bigint, clientId: bigint, payload: CreateOrderPaymentDto) {
    if (payload.method === PaymentMethod.CARTAO && !payload.card) throw new BadRequestException('Informe os dados do cartão');
    if (payload.method === PaymentMethod.PIX && payload.card) throw new BadRequestException('Não envie dados de cartão para pagamento PIX');

    const order = await this.prisma.order.findUnique({ where: { id: orderId }, select: {
      clientId: true, status: true, finalPrice: true,
      client: { select: { name: true, email: true, cpf: true } },
      payment: true,
      service: { select: { title: true, basePrice: true, platformFeePct: true, category: true,
        provider: { select: { id: true, pagarmeRecipientId: true } } } },
    } });
    if (!order) throw new NotFoundException('Pedido não encontrado');
    if (order.clientId !== clientId) throw new ForbiddenException('Apenas o cliente deste pedido pode iniciar o pagamento');
    if (![OrderStatus.AGENDADO, OrderStatus.AGUARDANDO_PAGAMENTO].includes(order.status as any)) {
      throw new BadRequestException('Este pedido não está disponível para pagamento');
    }
    if (!order.service.provider.pagarmeRecipientId) throw new BadRequestException('Prestador ainda não está habilitado para receber pagamentos');

    if (order.payment?.method === payload.method && this.isReusable(order.payment.status)) {
      return this.toResponse(order.payment);
    }

    const category = order.service.platformFeePct === null
      ? await this.prisma.category.findFirst({ where: { OR: [{ slug: order.service.category }, { name: order.service.category }] }, select: { platformFeePct: true } })
      : null;
    const feePct = Number(order.service.platformFeePct ?? category?.platformFeePct ?? process.env.DEFAULT_PLATFORM_FEE_PCT ?? 0.12);
    if (!Number.isFinite(feePct) || feePct < 0 || feePct > 1) throw new BadRequestException('Taxa da plataforma inválida');
    const amount = Number(order.finalPrice ?? order.service.basePrice);
    const amountCents = Math.round(amount * 100);
    const platformAmountCents = Math.round(amountCents * feePct);
    const providerAmountCents = amountCents - platformAmountCents;
    const gatewayInput = { orderId, amountCents, platformAmountCents, providerAmountCents,
      providerRecipientId: order.service.provider.pagarmeRecipientId,
      platformRecipientId: process.env.PAGARME_PLATFORM_RECIPIENT_ID,
      customer: order.client, card: payload.card ?? undefined };
    const gateway = payload.method === PaymentMethod.PIX
      ? await this.pagarme.createPixPayment(gatewayInput)
      : await this.pagarme.authorizeCardPayment(gatewayInput);
    const now = new Date();
    const status = payload.method === PaymentMethod.PIX ? PaymentStatus.PENDENTE : PaymentStatus.AUTORIZADO;

    const payment = await this.prisma.$transaction(async (prisma) => {
      const saved = await prisma.payment.upsert({
        where: { orderId },
        create: { orderId, method: payload.method, status, amount, feePct, platformAmount: platformAmountCents / 100,
          providerAmount: providerAmountCents / 100, providerOrderId: gateway.orderId, providerChargeId: gateway.chargeId,
          pixQrCode: gateway.qrCode, pixQrCodeBase64: gateway.qrCodeBase64, pixExpiresAt: gateway.expiresAt,
          authorizedAt: status === PaymentStatus.AUTORIZADO ? now : null, rawProviderResponse: gateway.raw as Prisma.InputJsonValue },
        update: { method: payload.method, status, amount, feePct, platformAmount: platformAmountCents / 100,
          providerAmount: providerAmountCents / 100, providerOrderId: gateway.orderId, providerChargeId: gateway.chargeId,
          pixQrCode: gateway.qrCode, pixQrCodeBase64: gateway.qrCodeBase64, pixExpiresAt: gateway.expiresAt,
          authorizedAt: status === PaymentStatus.AUTORIZADO ? now : null, failureReason: null,
          rawProviderResponse: gateway.raw as Prisma.InputJsonValue },
      });
      if (status === PaymentStatus.AUTORIZADO) {
        await prisma.orderTimeline.create({ data: { orderId, event: 'PAYMENT_AUTHORIZED', description: 'Pagamento autorizado.', createdBy: UserType.CLIENTE, createdAt: now } });
      }
      await prisma.order.update({ where: { id: orderId }, data: { status: OrderStatus.AGENDADO } });
      return saved;
    });
    return this.toResponse(payment);
  }

  async getOrderPayment(orderId: bigint, clientId: bigint) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, select: { clientId: true, payment: true } });
    if (!order) throw new NotFoundException('Pedido não encontrado');
    if (order.clientId !== clientId) throw new ForbiddenException('Pagamento indisponível para este usuário');
    if (!order.payment || order.payment.status === PaymentStatus.CREATED) throw new NotFoundException('Pagamento ainda não iniciado');
    return this.toResponse(order.payment);
  }

  async capturePayment(payment: { id: bigint; status: PaymentStatus; providerChargeId: string | null; amount?: any }) {
    if ([PaymentStatus.PAGO, PaymentStatus.CAPTURED, PaymentStatus.RELEASED].includes(payment.status as any)) return { capturedAt: new Date() };
    if (![PaymentStatus.AUTORIZADO, PaymentStatus.AUTHORIZED].includes(payment.status as any)) {
      throw new BadRequestException('O pagamento ainda não está autorizado para captura');
    }
    if (!payment.providerChargeId) throw new BadRequestException('Cobrança não encontrada no gateway');
    await this.pagarme.capturePayment(payment.providerChargeId, Number(payment.amount ?? 0));
    return { capturedAt: new Date() };
  }

  async handleWebhook(payload: PagarmeWebhookDto) {
    const existing = await this.prisma.paymentWebhookEvent.findUnique({ where: { id: payload.id }, select: { id: true } });
    if (existing) return { received: true };
    const chargeId = payload.data?.id ?? payload.data?.charge?.id;
    const payment = chargeId ? await this.prisma.payment.findUnique({ where: { providerChargeId: chargeId } }) : null;
    const mapping: Record<string, PaymentStatus> = {
      'charge.paid': PaymentStatus.PAGO, 'charge.payment_failed': PaymentStatus.FALHOU,
      'charge.canceled': PaymentStatus.CANCELADO, 'charge.refunded': PaymentStatus.REEMBOLSADO,
    };
    const status = mapping[payload.type];
    await this.prisma.$transaction(async (prisma) => {
      await prisma.paymentWebhookEvent.create({ data: { id: payload.id, paymentId: payment?.id,
        type: payload.type, payload: payload as unknown as Prisma.InputJsonValue } });
      if (payment && status) {
        const now = new Date();
        await prisma.payment.update({ where: { id: payment.id }, data: { status,
          paidAt: status === PaymentStatus.PAGO ? now : payment.paidAt,
          capturedAt: status === PaymentStatus.PAGO ? now : payment.capturedAt,
          canceledAt: status === PaymentStatus.CANCELADO ? now : payment.canceledAt,
          refundedAt: status === PaymentStatus.REEMBOLSADO ? now : payment.refundedAt,
          failureReason: status === PaymentStatus.FALHOU ? payload.data?.last_transaction?.gateway_response?.errors?.[0]?.message ?? 'Pagamento recusado' : null,
          rawProviderResponse: payload as unknown as Prisma.InputJsonValue } });
      }
    }).catch((error) => { if (error?.code !== 'P2002') throw error; });
    return { received: true };
  }

  private isReusable(status: PaymentStatus) {
    return [PaymentStatus.PENDENTE, PaymentStatus.AUTORIZADO, PaymentStatus.PAGO].includes(status as any);
  }

  private toResponse(payment: any) {
    return { id: payment.id.toString(), paymentId: payment.id.toString(), orderId: payment.orderId.toString(),
      method: payment.method, status: payment.status, amount: Number(payment.amount),
      platformAmount: Number(payment.platformAmount ?? 0), providerAmount: Number(payment.providerAmount ?? 0),
      feePct: Number(payment.feePct ?? 0), providerChargeId: payment.providerChargeId,
      pix: payment.method === PaymentMethod.PIX ? { qrCode: payment.pixQrCode, qrCodeBase64: payment.pixQrCodeBase64, expiresAt: payment.pixExpiresAt } : undefined };
  }
}
