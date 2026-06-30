import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { ProviderModule } from '../provider/provider.module';
import { CqrsModule } from '@nestjs/cqrs';
import { OrderQueryHandlers } from './queries';

@Module({
  imports: [ProviderModule, CqrsModule],
  controllers: [OrderController],
  providers: [OrderService, ...OrderQueryHandlers],
})
export class OrderModule {}
