import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { PagarmeService } from './pagarme.service';
import { PaymentService } from './payment.service';
import { PaymentsController } from './payments.controller';
import { ConfigModule } from '../../config/config.module';
import { PaymentCommandHandlers } from './commands';
import { PaymentQueryHandlers } from './queries';

@Module({
  imports: [ConfigModule, CqrsModule],
  controllers: [PaymentsController],
  providers: [
    PagarmeService,
    PaymentService,
    ...PaymentCommandHandlers,
    ...PaymentQueryHandlers,
  ],
  exports: [PaymentService],
})
export class PaymentsModule {}
