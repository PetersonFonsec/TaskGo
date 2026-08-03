import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Service } from '@prisma/client';

import { PrismaService } from '../../../../prisma/prisma.service';
import {
  PaginationDelegate,
  PaginationService,
} from '../../../../shared/services/pagination/pagination.service';
import { ListServicesQuery } from './list-services.query';

@QueryHandler(ListServicesQuery)
export class ListServicesHandler implements IQueryHandler<ListServicesQuery> {
  private readonly pagination: PaginationService<Service>;

  constructor(prisma: PrismaService) {
    this.pagination = new PaginationService(
      prisma.service as unknown as PaginationDelegate<Service>,
      {
        defaultSortBy: 'id',
        allowedSortFields: [
          'id',
          'title',
          'basePrice',
          'createdAt',
          'updatedAt',
        ],
        allowedSearchFields: ['title', 'description', 'category'],
      },
    );
  }

  execute({ pagination }: ListServicesQuery) {
    return this.pagination.listPaginated(pagination);
  }
}
