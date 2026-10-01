import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  Post,
  Query,
  RawBodyRequest,
  Req,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';
import { Public } from '../../shared/decorators/public.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentService } from './payment.service';
import { SettlementService } from './settlement/settlement.service';

// Published verification key: https://docs.abacatepay.com/pages/webhooks/security
export const ABACATEPAY_PUBLIC_KEY =
  't9dXRhHHo3yDEj5pVDYz0frf7q6bMKyMRmxxCPIPp3RCplBfXRxqlC6ZpiWmOqj4L63qEaeUOtrCI8P0VMUgo6iIga2ri9ogaHFs0WIIywSMg0q7RmBfybe1E5XJcfC4IW3alNqym0tXoAKkzvfEjZxV6bE0oG2zJrNNYmUCKZyV0KZ3JS8Votf9EAWWYdiDkMkpbMdPggfh1EqHlVkMiTady6jOR3hyzGEHrIz2Ret0xHKMbiqkr9HS1JhNHDX9';
function equal(a: string, b: unknown) {
  if (typeof b !== 'string') return false;
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
@Controller('payments/webhook/abacatepay')
export class AbacatePayWebhookController {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly payments: PaymentService,
    private readonly settlements: SettlementService,
  ) {}
  @Public()
  @Post()
  @HttpCode(200)
  async webhook(
    @Req() request: RawBodyRequest<Request>,
    @Query('webhookSecret') secret: string,
    @Headers('x-webhook-signature') signature: string,
  ) {
    const expected = this.config.get<string>('payment.webhookSecret');
    if (
      !expected ||
      !equal(expected, secret) ||
      !request.rawBody ||
      !equal(
        createHmac('sha256', ABACATEPAY_PUBLIC_KEY)
          .update(request.rawBody)
          .digest('base64'),
        signature,
      )
    )
      throw new UnauthorizedException('Webhook inválido');
    const payload = request.body;
    if (
      !payload ||
      typeof payload.id !== 'string' ||
      !payload.id ||
      payload.id.length > 128 ||
      typeof payload.event !== 'string' ||
      payload.apiVersion !== 2 ||
      typeof payload.devMode !== 'boolean'
    )
      throw new BadRequestException('Evento inválido');
    if (payload.devMode !== this.config.get<boolean>('payment.devMode'))
      throw new BadRequestException('Ambiente do webhook divergente');
    const eventId = `abacatepay:${payload.id}`;
    const previous = await this.prisma.paymentWebhookEvent.findUnique({
      where: { id: eventId },
    });
    if (previous?.processedAt) return { received: true };
    let paymentId: bigint | undefined;
    if (payload.event.startsWith('transparent.')) {
      const resource = payload.data?.transparent;
      const id = resource?.id;
      if (typeof id !== 'string')
        throw new BadRequestException('Cobrança inválida');
      const payment = await this.prisma.payment.findFirst({
        where: { provider: 'ABACATEPAY', providerChargeId: id },
      });
      if (!payment)
        throw new ServiceUnavailableException(
          'Cobrança ainda não vinculada; reenviar evento',
        );
      paymentId = payment.id;
      if (
        [
          'transparent.disputed',
          'transparent.lost',
          'transparent.refunded',
        ].includes(payload.event)
      ) {
        await this.prisma.$transaction(async (tx) => {
          await tx.$queryRaw`SELECT pg_advisory_xact_lock(${payment.id})::text`;
          await tx.payment.update({
            where: { id: payment.id },
            data: { settlementBlockedAt: new Date() },
          });
        });
      }
      await this.payments.reconcilePayment(payment.id);
    } else if (
      payload.event === 'transfer.completed' ||
      payload.event === 'transfer.failed'
    ) {
      const externalId = payload.data?.transfer?.externalId;
      if (typeof externalId !== 'string')
        throw new BadRequestException('Transferência inválida');
      const settlement = await this.prisma.paymentSettlement.findUnique({
        where: { externalId },
      });
      if (!settlement)
        throw new ServiceUnavailableException(
          'Repasse ainda não vinculado; reenviar evento',
        );
      paymentId = settlement.paymentId;
      // Canonical lookup, never accept the status/amount from the webhook body.
      await this.settlements.process(paymentId);
    } else return { received: true, ignored: true };
    await this.prisma.paymentWebhookEvent.upsert({
      where: { id: eventId },
      create: {
        id: eventId,
        type: payload.event,
        paymentId,
        payload: { event: payload.event },
        processedAt: new Date(),
      },
      update: { processedAt: new Date(), paymentId },
    });
    return { received: true };
  }
}
