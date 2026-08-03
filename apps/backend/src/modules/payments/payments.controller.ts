import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';

import { User } from '../../shared/decorators/user.decorator';
import { Public } from '../../shared/decorators/public.decorator';
import { CreateOrderPaymentDto } from './dto/create-order-payment.dto';
import { PagarmeWebhookDto } from './dto/pagarme-webhook.dto';
import { ParseBigIntPipe } from '../../shared/pipes/parse-bigint.pipe';
import {
  CreateOrderPaymentCommand,
  ProcessPagarmeWebhookCommand,
} from './commands';
import { GetOrderPaymentQuery } from './queries';

@Controller()
export class PaymentsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post('orders/:id/payment')
  create(
    @Param('id', ParseBigIntPipe) id: bigint,
    @User('id') clientId: string,
    @Body() payload: CreateOrderPaymentDto,
  ) {
    return this.commandBus.execute(
      new CreateOrderPaymentCommand(id, BigInt(clientId), payload),
    );
  }

  @Get('orders/:id/payment')
  findOne(
    @Param('id', ParseBigIntPipe) id: bigint,
    @User('id') clientId: string,
  ) {
    return this.queryBus.execute(
      new GetOrderPaymentQuery(id, BigInt(clientId)),
    );
  }

  @Public()
  @Post('payments/webhook/pagarme')
  @HttpCode(200)
  webhook(@Body() payload: PagarmeWebhookDto) {
    return this.commandBus.execute(new ProcessPagarmeWebhookCommand(payload));
  }
}
