import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { ProviderModule } from '../provider/provider.module';
import { CqrsModule } from '@nestjs/cqrs';
import { OrderQueryHandlers } from './queries';
import { OrderCommandHandlers } from './commands';
import { PaymentService } from './payment/payment.service';

@Module({
  imports: [ProviderModule, CqrsModule],
  controllers: [OrderController],
  providers: [OrderService, PaymentService, ...OrderQueryHandlers, ...OrderCommandHandlers],
})
export class OrderModule {}
