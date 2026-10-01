import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PaymentSettlement, Prisma, UserType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { PaymentGateway, PixDestination, Transfer } from '../payment-gateway';
import { paidStatuses } from '../payment-state';
import { SettlementStrategies } from './settlement-strategies';

@Injectable()
export class SettlementService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SettlementService.name);
  private timer?: ReturnType<typeof setInterval>;
  private running = false;
  constructor(
    private readonly prisma: PrismaService,
    private readonly strategies: SettlementStrategies,
    private readonly gateway: PaymentGateway,
  ) {}
  onModuleInit() {
    // In tests, exercise drain/process explicitly. All replicas may run this worker.
    if (process.env.NODE_ENV === 'test') return;
    this.timer = setInterval(() => {
      void this.drain();
    }, 30000);
    this.timer.unref();
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
  async drain() {
    if (this.running) return;
    this.running = true;
    try {
      const rows = await this.prisma.paymentSettlement.findMany({
        where: { status: { in: ['READY', 'SUBMITTING', 'PENDING', 'REVIEW'] } },
        orderBy: { updatedAt: 'asc' },
        take: 20,
      });
      for (const row of rows) {
        try {
          await this.process(row.paymentId);
        } catch {
          await this.prisma.paymentSettlement.updateMany({
            where: {
              paymentId: row.paymentId,
              status: { in: ['READY', 'SUBMITTING', 'PENDING', 'REVIEW'] },
            },
            data: { lastError: 'Conciliação pendente', updatedAt: new Date() },
          });
          this.logger.warn(`Repasse ${row.paymentId}: aguardando conciliação`);
        }
      }
    } catch {
      this.logger.error('Falha ao consultar fila de repasses');
    } finally {
      this.running = false;
    }
  }
  async process(paymentId: bigint) {
    const claimed = await this.prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(${paymentId})::text`;
        const row = await tx.paymentSettlement.findUniqueOrThrow({
          where: { paymentId },
        });
        if (['SUCCEEDED', 'FAILED', 'BLOCKED'].includes(row.status))
          return { row, submit: false };
        const payment = await tx.payment.findUniqueOrThrow({
          where: { id: paymentId },
        });
        if (payment.provider !== this.gateway.provider)
          throw new Error('Provider mismatch');
        this.strategies.resolve(row.strategy);
        if (row.status !== 'READY') return { row, submit: false };
        await tx.$queryRaw`SELECT id FROM pedidos WHERE id = ${payment.orderId} FOR UPDATE`;
        const order = await tx.order.findUniqueOrThrow({
          where: { id: payment.orderId },
        });
        const dispute = await tx.orderDispute.findFirst({
          where: {
            orderId: payment.orderId,
            status: { in: ['OPEN', 'UNDER_REVIEW'] },
          },
        });
        const valid =
          order.status === 'CONCLUIDO' &&
          order.clientConfirmedAt &&
          paidStatuses.includes(payment.status) &&
          !payment.refundRequestedAt &&
          !payment.settlementBlockedAt &&
          !dispute &&
          row.amountCents === Math.round(Number(payment.providerAmount) * 100);
        if (!valid) {
          return {
            row: await tx.paymentSettlement.update({
              where: { paymentId },
              data: {
                status: 'BLOCKED',
                lastError: 'Pagamento, confirmação ou disputa impede repasse',
              },
            }),
            submit: false,
          };
        }
        if (!this.gateway.simulated) {
          if (!payment.providerChargeId) throw new Error('Missing charge');
          const charge = await this.gateway.getCharge(payment.providerChargeId);
          if (
            charge.status !== 'paid' ||
            charge.id !== payment.providerChargeId ||
            charge.amount !== Math.round(Number(payment.amount) * 100)
          )
            throw new Error('Cobrança não permite repasse');
        }
        return {
          row: await tx.paymentSettlement.update({
            where: { paymentId },
            data: { status: 'SUBMITTING', submittedAt: new Date() },
          }),
          submit: true,
        };
      },
      { timeout: 60000 },
    );
    const { row, submit } = claimed;
    if (['SUCCEEDED', 'FAILED', 'BLOCKED'].includes(row.status)) return row;
    try {
      const strategy = this.strategies.resolve(row.strategy);
      const result = submit
        ? await strategy.release({
            externalId: row.externalId,
            amount: row.amountCents,
            destination: row.destination as PixDestination,
          })
        : await strategy.reconcile(row.externalId);
      if (!result) {
        return this.prisma.paymentSettlement.update({
          where: { paymentId },
          data: {
            lastError:
              'Operação ainda não localizada; não reenviar automaticamente',
          },
        });
      }
      return await this.record(row, result);
    } catch (error) {
      // Do not regress a webhook-confirmed success while a submitting request fails.
      await this.prisma.paymentSettlement.updateMany({
        where: {
          paymentId,
          status: { in: ['SUBMITTING', 'PENDING', 'REVIEW'] },
        },
        data: {
          lastError:
            'Resposta inconclusiva; consultar pelo externalId antes de qualquer reenvio',
        },
      });
      throw error;
    }
  }
  private async record(row: PaymentSettlement, transfer: Transfer) {
    if (
      transfer.externalId !== row.externalId ||
      transfer.amount !== row.amountCents ||
      (row.transferId && row.transferId !== transfer.id)
    )
      throw new Error('Repasse divergente');
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(${row.paymentId})::text`;
      const current = await tx.paymentSettlement.findUniqueOrThrow({
        where: { paymentId: row.paymentId },
      });
      if (
        current.status === 'SUCCEEDED' ||
        (current.status === 'FAILED' && transfer.status === 'PENDING')
      )
        return current;
      if (current.transferId && current.transferId !== transfer.id)
        throw new Error('Identificador divergente');
      const status =
        transfer.status === 'COMPLETE'
          ? 'SUCCEEDED'
          : transfer.status === 'PENDING'
            ? 'PENDING'
            : 'FAILED';
      const saved = await tx.paymentSettlement.update({
        where: { paymentId: row.paymentId },
        data: {
          status,
          transferId: transfer.id,
          lastError: status === 'FAILED' ? `Gateway: ${transfer.status}` : null,
          ...(status === 'SUCCEEDED' ? { completedAt: new Date() } : {}),
        },
      });
      if (status === 'SUCCEEDED') {
        const payment = await tx.payment.findUniqueOrThrow({
          where: { id: row.paymentId },
        });
        await tx.orderTimeline.create({
          data: {
            orderId: payment.orderId,
            event: 'PAYMENT_RELEASED',
            description: 'Repasse ao prestador confirmado pelo gateway.',
            createdBy: UserType.PRESTADOR,
            createdAt: new Date(),
          },
        });
      }
      return saved;
    });
  }
}
