import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';

import { PaginationQuery } from '../../shared/services/pagination/pagination.interface';

import { ScheduleOrderDto } from './dto/schedule-order.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  GetOrderDetailsQuery,
  GetOrderSummaryQuery,
  ListClientOrdersQuery,
  ListOrdersQuery,
  ListProviderOrdersQuery,
} from './queries';
import {
  CancelOrderByProviderCommand,
  ConfirmOrderByProviderCommand,
  ConfirmOrderCompletionCommand,
  CreateOrderCommand,
  CreateOrderReviewCommand,
  FinishOrderCommand,
  RemoveOrderCommand,
  ScheduleOrderCommand,
  UpdateOrderCommand,
} from './commands';
import { FinishOrderDto } from './dto/finish-order.dto';
import { User } from '../../shared/decorators/user.decorator';
import { ConfirmOrderCompletionDto } from './dto/confirm-order-completion.dto';
import { CreateOrderReviewDto } from './dto/create-order-review.dto';
import { ParseBigIntPipe } from '../../shared/pipes/parse-bigint.pipe';

@Controller(['order', 'orders'])
export class OrderController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  @Post()
  create(@Body() createOrderDto: CreateOrderDto) {
    return this.commandBus.execute(new CreateOrderCommand(createOrderDto));
  }

  @Get()
  findAll(@Query() query: PaginationQuery) {
    return this.queryBus.execute(new ListOrdersQuery(query));
  }

  @Get(':id')
  findOne(@Param('id', ParseBigIntPipe) id: bigint) {
    return this.queryBus.execute(new GetOrderDetailsQuery(id));
  }

  @Get(':id/summary')
  getSummary(@Param('id', ParseBigIntPipe) id: bigint) {
    return this.queryBus.execute(new GetOrderSummaryQuery(id));
  }

  @Get('client/:clientId')
  findByClient(@Param('clientId', ParseBigIntPipe) clientId: bigint) {
    return this.queryBus.execute(new ListClientOrdersQuery(clientId));
  }

  @Get('provider/:providerId')
  findByProvider(@Param('providerId', ParseBigIntPipe) providerId: bigint) {
    return this.queryBus.execute(new ListProviderOrdersQuery(providerId));
  }

  @Patch(':id')
  update(
    @Param('id', ParseBigIntPipe) id: bigint,
    @Body() updateOrderDto: UpdateOrderDto,
  ) {
    return this.commandBus.execute(new UpdateOrderCommand(id, updateOrderDto));
  }

  @Patch(':id/finish')
  finish(
    @Param('id', ParseBigIntPipe) id: bigint,
    @User('id') providerId: string,
    @Body() payload: FinishOrderDto,
  ) {
    return this.commandBus.execute(
      new FinishOrderCommand(id, BigInt(providerId), payload),
    );
  }

  @Patch(':id/confirm')
  confirmCompletion(
    @Param('id', ParseBigIntPipe) id: bigint,
    @User('id') clientId: string,
    @Body() payload: ConfirmOrderCompletionDto,
  ) {
    return this.commandBus.execute(
      new ConfirmOrderCompletionCommand(id, BigInt(clientId), payload),
    );
  }

  @Post(':id/review')
  createReview(
    @Param('id', ParseBigIntPipe) id: bigint,
    @User('id') clientId: string,
    @Body() payload: CreateOrderReviewDto,
  ) {
    return this.commandBus.execute(
      new CreateOrderReviewCommand(id, BigInt(clientId), payload),
    );
  }

  @Delete(':id')
  remove(@Param('id', ParseBigIntPipe) id: bigint) {
    return this.commandBus.execute(new RemoveOrderCommand(id));
  }

  @Post(':id/schedule')
  schedule(
    @Param('id', ParseBigIntPipe) id: bigint,
    @Body() body: ScheduleOrderDto,
  ) {
    return this.commandBus.execute(new ScheduleOrderCommand(id, body));
  }

  @Post(':id/provider/:providerId/confirm')
  confirmByProvider(
    @Param('id', ParseBigIntPipe) id: bigint,
    @Param('providerId', ParseBigIntPipe) providerId: bigint,
  ) {
    return this.commandBus.execute(
      new ConfirmOrderByProviderCommand(id, providerId),
    );
  }

  @Post(':id/provider/:providerId/cancel')
  cancelByProvider(
    @Param('id', ParseBigIntPipe) id: bigint,
    @Param('providerId', ParseBigIntPipe) providerId: bigint,
  ) {
    return this.commandBus.execute(
      new CancelOrderByProviderCommand(id, providerId),
    );
  }
}
