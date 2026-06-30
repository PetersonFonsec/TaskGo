import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';

import { PaginationQuery } from '../../shared/services/pagination/pagination.interface';

import { ScheduleOrderDto } from './dto/schedule-order.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrderService } from './order.service';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { GetOrderDetailsQuery } from './queries';
import { FinishOrderCommand } from './commands';
import { FinishOrderDto } from './dto/finish-order.dto';
import { User } from '../../shared/decorators/user.decorator';

@Controller(['order', 'orders'])
export class OrderController {
  constructor(
    private readonly orderService: OrderService,
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  @Post()
  create(@Body() createOrderDto: CreateOrderDto) {
    return this.orderService.create(createOrderDto);
  }

  @Get()
  findAll(@Query() query: PaginationQuery) {
    return this.orderService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.queryBus.execute(new GetOrderDetailsQuery(BigInt(id)));
  }

  @Get(':id/summary')
  getSummary(@Param('id') id: string) {
    return this.orderService.getSummary(BigInt(id));
  }

  @Get('client/:clientId')
  findByClient(@Param('clientId') clientId: string) {
    return this.orderService.findByClient(BigInt(clientId));
  }

  @Get('provider/:providerId')
  findByProvider(@Param('providerId') providerId: string) {
    return this.orderService.findByProvider(BigInt(providerId));
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateOrderDto: UpdateOrderDto) {
    return this.orderService.update(BigInt(id), updateOrderDto);
  }

  @Patch(':id/finish')
  finish(
    @Param('id') id: string,
    @User('id') providerId: string,
    @Body() payload: FinishOrderDto,
  ) {
    return this.commandBus.execute(
      new FinishOrderCommand(BigInt(id), BigInt(providerId), payload),
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.orderService.remove(BigInt(id));
  }

  @Post(':id/schedule')
  schedule(@Param('id') id: string, @Body() body: ScheduleOrderDto) {
    return this.orderService.schedule(BigInt(id), body);
  }

  @Post(':id/provider/:providerId/confirm')
  confirmByProvider(@Param('id') id: string, @Param('providerId') providerId: string) {
    return this.orderService.confirmByProvider(BigInt(id), BigInt(providerId));
  }

  @Post(':id/provider/:providerId/cancel')
  cancelByProvider(@Param('id') id: string, @Param('providerId') providerId: string) {
    return this.orderService.cancelByProvider(BigInt(id), BigInt(providerId));
  }
}
