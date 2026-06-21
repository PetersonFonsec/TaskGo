import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { ProviderModule } from '../provider/provider.module';

@Module({
  imports: [ProviderModule],
  controllers: [OrderController],
  providers: [OrderService],
})
export class OrderModule {}
