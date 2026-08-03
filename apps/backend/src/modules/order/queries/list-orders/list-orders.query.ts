import { PaginationQuery } from '../../../../shared/services/pagination/pagination.interface';

export class ListOrdersQuery {
  constructor(public readonly pagination: PaginationQuery) {}
}
