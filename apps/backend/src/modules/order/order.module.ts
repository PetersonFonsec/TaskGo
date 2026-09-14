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

@Module({
  imports: [AdminAuthModule, ProviderModule, CqrsModule, PaymentsModule],
  controllers: [
    OrderController,
    OrderDisputesController,
    AdminOrderDisputesController,
  ],
  providers: [...OrderQueryHandlers, ...OrderCommandHandlers],
})
export class OrderModule {}
