import { Injectable } from '@nestjs/common';
import { Order } from '@prisma/client';

import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';

import { PaginationQuery, PaginationResponse } from '@shared/services/pagination/pagination.interface';
import { PaginationService } from '@shared/services/pagination/pagination.service';
import { PrismaService } from '@prisma/prisma.service';

@Injectable()
export class OrderService extends PaginationService<Order> {

  constructor(
    public prisma: PrismaService,
  ) {
    super(prisma);
    this.modelName = this.prisma.order;
  }

  async create(createOrderDto: CreateOrderDto): Promise<any> {
    return 'This action adds a new order';
  }

  async findAll(query: PaginationQuery): Promise<PaginationResponse<Order>> {
    const queryDefault: PaginationQuery = { page: 1, limit: 10, sortBy: 'id', order: 'desc', search: '' };
    return await this.listPaginated(Object.assign(queryDefault, query));
  }

  async findOne(id: bigint): Promise<any> {
    return await this.prisma.order.findUnique({
      where: { id }
    });
  }

  async update(id: bigint, updateUserDto: UpdateOrderDto) {
    return await this.prisma.order.update({
      where: { id },
      data: updateUserDto,
    });
  }

  async remove(id: bigint) {
    return await this.prisma.order.delete({
      where: { id },
    });
  }
}
