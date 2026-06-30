import { BadRequestException, Injectable } from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';

/**
 * Boundary for the payment gateway. Replace the successful placeholder below
 * with the provider capture call; callers only persist CAPTURED after it returns.
 */
@Injectable()
export class PaymentService {
  async capturePayment(payment: { id: bigint; status: PaymentStatus; providerChargeId: string | null }) {
    if (payment.status === PaymentStatus.CAPTURED) return { capturedAt: new Date() };
    if (payment.status !== PaymentStatus.AUTHORIZED) {
      throw new BadRequestException('O pagamento ainda não está autorizado para captura');
    }

    // TODO(payment-gateway): capture using providerChargeId and an idempotency key.
    return { capturedAt: new Date() };
  }
}
