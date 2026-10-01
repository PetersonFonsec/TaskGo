import {
  OrderDisputesController,
  AdminOrderDisputesController,
} from './order-disputes.controller';
import { AdminAuthModule } from '../admin/auth/admin-auth.module';
import { Module } from '@nestjs/common';
import { OrderController } from './order.controller';
import { ProviderModule } from '../provider/provider.module';
import { CqrsModule } from '@nestjs/cqrs';
import { OrderQueryHandlers } from './queries';
import { OrderCommandHandlers } from './commands';
import { PaymentsModule } from '../payments/payments.module';
import { NotificationModule } from '../notification/notification.module';
import { OrderExpirationPolicy } from './expiration/order-expiration.policy';
import { OrderExpirationService } from './expiration/order-expiration.service';

@Module({
  imports: [
    AdminAuthModule,
    ProviderModule,
    CqrsModule,
    PaymentsModule,
    NotificationModule,
  ],
  controllers: [
    OrderController,
    OrderDisputesController,
    AdminOrderDisputesController,
  ],
  providers: [
    ...OrderQueryHandlers,
    ...OrderCommandHandlers,
    OrderExpirationPolicy,
    OrderExpirationService,
  ],
})
export class OrderModule {}
