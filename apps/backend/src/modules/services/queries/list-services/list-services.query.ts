import { PaginationQuery } from '../../../../shared/services/pagination/pagination.interface';

export class ListServicesQuery {
  constructor(public readonly pagination: PaginationQuery) {}
}
