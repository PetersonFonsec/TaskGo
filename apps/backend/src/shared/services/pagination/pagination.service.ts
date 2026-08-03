import { BadRequestException, Injectable } from '@nestjs/common';

import { PaginationQuery, PaginationResponse } from './pagination.interface';
import { QueryParams } from '../../utils/queryParams';

export type PaginationDelegate<T> = {
  count(args: Record<string, unknown>): Promise<number>;
  findMany(args: Record<string, unknown>): Promise<T[]>;
};

type PaginationOptions = {
  defaultSortBy: string;
  allowedSortFields: readonly string[];
  allowedSearchFields: readonly string[];
  defaultOrder?: 'asc' | 'desc';
};

@Injectable()
export class PaginationService<T> {
  constructor(
    private readonly delegate: PaginationDelegate<T>,
    private readonly options: PaginationOptions,
  ) {}

  async listPaginated(
    query: PaginationQuery,
    requiredWhere: Record<string, unknown> = {},
  ): Promise<PaginationResponse<T>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const sortBy = query.sortBy ?? this.options.defaultSortBy;
    const order = query.order ?? this.options.defaultOrder ?? 'desc';

    if (!this.options.allowedSortFields.includes(sortBy)) {
      throw new BadRequestException(`Unsupported sort field: ${sortBy}`);
    }

    const searchWhere = this.buildSearchFilter(query.search);
    const where = searchWhere
      ? { AND: [requiredWhere, searchWhere] }
      : requiredWhere;

    const [total, data] = await Promise.all([
      this.delegate.count({ where }),
      this.delegate.findMany({
        where,
        orderBy: { [sortBy]: order },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasPrevPage: page > 1,
        hasNextPage: page < totalPages,
      },
    };
  }

  private buildSearchFilter(search?: string) {
    if (!search) return undefined;

    const filters = QueryParams.extractSearchParams(search);
    if (filters.length === 0) {
      throw new BadRequestException('Invalid search expression');
    }
    const unsupported = filters.find(
      ({ key }) => !this.options.allowedSearchFields.includes(key),
    );
    if (unsupported) {
      throw new BadRequestException(
        `Unsupported search field: ${unsupported.key}`,
      );
    }

    return {
      OR: filters.map(({ key, value }) => ({
        [key]: { contains: value, mode: 'insensitive' },
      })),
    };
  }
}
