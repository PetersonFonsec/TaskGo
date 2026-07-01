import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';

import { User } from '../../shared/decorators/user.decorator';
import { Public } from '../../shared/decorators/public.decorator';
import { CreateOrderPaymentDto } from './dto/create-order-payment.dto';
import { PagarmeWebhookDto } from './dto/pagarme-webhook.dto';
import { PaymentService } from './payment.service';

@Controller()
export class PaymentsController {
  constructor(private readonly payments: PaymentService) {}

  @Post('orders/:id/payment')
  create(@Param('id') id: string, @User('id') clientId: string, @Body() payload: CreateOrderPaymentDto) {
    return this.payments.createOrderPayment(BigInt(id), BigInt(clientId), payload);
  }

  @Get('orders/:id/payment')
  findOne(@Param('id') id: string, @User('id') clientId: string) {
    return this.payments.getOrderPayment(BigInt(id), BigInt(clientId));
  }

  @Public()
  @Post('payments/webhook/pagarme')
  @HttpCode(200)
  webhook(@Body() payload: PagarmeWebhookDto) {
    return this.payments.handleWebhook(payload);
  }
}
