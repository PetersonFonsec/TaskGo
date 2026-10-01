import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentService } from '../payments/payment.service';
@Injectable()
export class ReservationExpiryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ReservationExpiryService.name);
  private timer?: ReturnType<typeof setInterval>;
  private running = false;
  private cursor?: bigint;
  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PaymentService,
  ) {}
  onModuleInit() {
    if (process.env.NODE_ENV === 'test') return;
    this.timer = setInterval(() => {
      void this.sweep();
    }, 60000);
    this.timer.unref();
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
  async sweep() {
    if (this.running) return;
    this.running = true;
    try {
      const rows = await this.prisma.order.findMany({
        where: {
          status: { in: ['AGUARDANDO_APROVACAO', 'AGUARDANDO_PAGAMENTO'] },
          reservationExpiresAt: { lte: new Date() },
        },
        select: { id: true, payment: true, paymentAttempt: true },
        take: 50,
        ...(this.cursor ? { cursor: { id: this.cursor }, skip: 1 } : {}),
        orderBy: { id: 'asc' },
      });
      this.cursor = rows.length === 50 ? rows[rows.length - 1].id : undefined;
      for (const row of rows) {
        try {
          if (row.payment?.providerChargeId)
            await this.payments.reconcilePayment(row.payment.id);
          else if (row.paymentAttempt) continue; // A submitted but unlinked charge requires reconciliation; never release it blindly.
          await this.prisma.$transaction(async (tx) => {
            await tx.$queryRaw`SELECT id FROM pedidos WHERE id = ${row.id} FOR UPDATE`;
            await tx.order.updateMany({
              where: {
                id: row.id,
                status: {
                  in: ['AGUARDANDO_APROVACAO', 'AGUARDANDO_PAGAMENTO'],
                },
                reservationExpiresAt: { lte: new Date() },
                payment: {
                  status: {
                    in: [
                      'CREATED',
                      'CANCELADO',
                      'CANCELED',
                      'FALHOU',
                      'FAILED',
                      'REEMBOLSADO',
                      'REFUNDED',
                    ],
                  },
                },
                OR: [
                  { paymentAttempt: { is: null } },
                  { payment: { providerChargeId: { not: null } } },
                ],
              },
              data: { status: 'CANCELADO' },
            });
          });
        } catch {
          this.logger.warn('Reservation requires reconciliation before expiry');
        }
      }
    } catch {
      this.logger.error('Reservation expiry failed');
    } finally {
      this.running = false;
    }
  }
}
