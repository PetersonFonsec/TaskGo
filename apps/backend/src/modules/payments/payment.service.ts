import { BadRequestException, Injectable } from '@nestjs/common';
import { Payment, PaymentStatus } from '@prisma/client';

import { PagarmeService } from './pagarme.service';

type CapturablePayment = Pick<
  Payment,
  'id' | 'status' | 'providerChargeId' | 'amount'
>;

@Injectable()
export class PaymentService {
  constructor(private readonly pagarme: PagarmeService) {}

  async capturePayment(payment: CapturablePayment) {
    const capturedStatuses: PaymentStatus[] = [
      PaymentStatus.PAGO,
      PaymentStatus.CAPTURED,
      PaymentStatus.RELEASED,
    ];
    if (capturedStatuses.includes(payment.status)) {
      return { capturedAt: new Date() };
    }

    const authorizedStatuses: PaymentStatus[] = [
      PaymentStatus.AUTORIZADO,
      PaymentStatus.AUTHORIZED,
    ];
    if (!authorizedStatuses.includes(payment.status)) {
      throw new BadRequestException(
        'O pagamento ainda não está autorizado para captura',
      );
    }
    if (!payment.providerChargeId) {
      throw new BadRequestException('Cobrança não encontrada no gateway');
    }

    await this.pagarme.capturePayment(
      payment.providerChargeId,
      Number(payment.amount),
    );
    return { capturedAt: new Date() };
  }
}
