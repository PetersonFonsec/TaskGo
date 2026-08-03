import { BadRequestException } from '@nestjs/common';
import { PaymentStatus, Prisma } from '@prisma/client';

import { PaymentService } from './payment.service';

describe('PaymentService', () => {
  const amount = new Prisma.Decimal(120);
  let gateway: { capturePayment: jest.Mock };
  let service: PaymentService;

  beforeEach(() => {
    gateway = { capturePayment: jest.fn().mockResolvedValue({}) };
    service = new PaymentService(gateway as never);
  });

  it('captures an authorized payment through the gateway', async () => {
    await service.capturePayment({
      id: 1n,
      status: PaymentStatus.AUTORIZADO,
      providerChargeId: 'ch_1',
      amount,
    });

    expect(gateway.capturePayment).toHaveBeenCalledWith('ch_1', 120);
  });

  it('does not capture an already paid payment again', async () => {
    await service.capturePayment({
      id: 1n,
      status: PaymentStatus.PAGO,
      providerChargeId: 'ch_1',
      amount,
    });

    expect(gateway.capturePayment).not.toHaveBeenCalled();
  });

  it('rejects a payment that is not authorized', async () => {
    await expect(
      service.capturePayment({
        id: 1n,
        status: PaymentStatus.PENDENTE,
        providerChargeId: 'ch_1',
        amount,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
