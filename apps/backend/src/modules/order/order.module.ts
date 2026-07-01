import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { ProviderModule } from '../provider/provider.module';
import { CqrsModule } from '@nestjs/cqrs';
import { OrderQueryHandlers } from './queries';
import { OrderCommandHandlers } from './commands';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [ProviderModule, CqrsModule, PaymentsModule],
  controllers: [OrderController],
  providers: [OrderService, ...OrderQueryHandlers, ...OrderCommandHandlers],
})
export class OrderModule {}
