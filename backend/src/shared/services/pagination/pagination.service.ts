import { Injectable } from '@nestjs/common';

import { PaginationResponse } from './pagination.interface';
import { QueryParams } from '@shared/utils/queryParams';
import { PrismaService } from '@PrismaDir/prisma.service';

@Injectable()
export class PaginationService<T> {
  public modelName: any;

  constructor(public prisma: PrismaService) { }

  private buildSearchFilter(search: string): any {
    if (!search) return {};

    const searchParams = QueryParams.extractSearchParams(search);
    const formatSearch = searchParams.map(({ key, value }: any) => ({
      [key]: { contains: value, mode: 'insensitive' },
    }));

    const searchBy = {
      OR: formatSearch,
    };

    const where: any = search
      ? searchBy
      : undefined;

    return where;
  }

  private buildPaginationMeta(total: number, page: number, limit: number) {
    const totalPages = Math.max(1, Math.ceil(total / limit!));

    return {
      total,
      page,
      limit,
      totalPages,
      hasPrevPage: page! > 1,
      hasNextPage: page! < totalPages,
    };
  }

  async listPaginated(q: any): Promise<PaginationResponse<T>> {
    const { page, limit, sortBy, order, search } = q;

    const where = this.buildSearchFilter(search);

    const [total, data] = await this.prisma.$transaction([
      this.modelName.count({ where }),
      this.modelName.findMany({
        where,
        orderBy: { [sortBy!]: order },
        skip: (page! - 1) * limit!,
        take: -limit,
      }),
    ]);

    const meta = this.buildPaginationMeta(total, page, limit);

    return {
      data,
      meta,
    } as PaginationResponse<T>;
  }
}
