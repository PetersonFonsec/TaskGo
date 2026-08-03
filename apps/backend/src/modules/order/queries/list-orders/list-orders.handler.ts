import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Order } from '@prisma/client';

import { PrismaService } from '../../../../prisma/prisma.service';
import {
  PaginationDelegate,
  PaginationService,
} from '../../../../shared/services/pagination/pagination.service';
import { ListOrdersQuery } from './list-orders.query';

@QueryHandler(ListOrdersQuery)
export class ListOrdersHandler implements IQueryHandler<ListOrdersQuery> {
  private readonly pagination: PaginationService<Order>;

  constructor(prisma: PrismaService) {
    this.pagination = new PaginationService(
      prisma.order as unknown as PaginationDelegate<Order>,
      {
        defaultSortBy: 'id',
        allowedSortFields: ['id', 'requestedAt', 'scheduledFor', 'status'],
        allowedSearchFields: [],
      },
    );
  }

  execute({ pagination }: ListOrdersQuery) {
    return this.pagination.listPaginated(pagination);
  }
}
