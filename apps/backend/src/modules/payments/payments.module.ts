import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { AbacatePayService } from './abacatepay.service';
import { PaymentGateway } from './payment-gateway';
import { PixTransferStrategy } from './settlement/pix-transfer.strategy';
import { SettlementStrategies } from './settlement/settlement-strategies';
import { SettlementService } from './settlement/settlement.service';
import { PayoutDestinationController } from './payout-destination.controller';
import { AbacatePayWebhookController } from './abacatepay-webhook.controller';
import { PaymentService } from './payment.service';
import { PaymentsController } from './payments.controller';
import { ConfigModule } from '../../config/config.module';
import { PaymentCommandHandlers } from './commands';
import { PaymentQueryHandlers } from './queries';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [ConfigModule, CqrsModule, NotificationModule],
  controllers: [
    PaymentsController,
    PayoutDestinationController,
    AbacatePayWebhookController,
  ],
  providers: [
    { provide: PaymentGateway, useClass: AbacatePayService },
    PixTransferStrategy,
    SettlementStrategies,
    SettlementService,
    PaymentService,
    ...PaymentCommandHandlers,
    ...PaymentQueryHandlers,
  ],
  exports: [PaymentService],
})
export class PaymentsModule {}
