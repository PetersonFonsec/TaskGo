import { Module } from '@nestjs/common';

import { PagarmeService } from './pagarme.service';
import { PaymentService } from './payment.service';
import { PaymentsController } from './payments.controller';

@Module({ controllers: [PaymentsController], providers: [PagarmeService, PaymentService], exports: [PaymentService] })
export class PaymentsModule {}
