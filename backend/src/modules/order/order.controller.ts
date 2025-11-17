import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';

import { PaginationQuery } from '@shared/services/pagination/pagination.interface';

import { ScheduleOrderDto } from './dto/schedule-order.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrderService } from './order.service';

@Controller('order')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

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
    return this.orderService.findOne(BigInt(id));
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateOrderDto: UpdateOrderDto) {
    return this.orderService.update(BigInt(id), updateOrderDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.orderService.remove(BigInt(id));
  }

  @Post(':id/schedule')
  schedule(@Param('id') id: string, @Body() body: ScheduleOrderDto) {
    return this.orderService.schedule(BigInt(id), body);
  }
}
