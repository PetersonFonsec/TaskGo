import { Injectable } from '@nestjs/common';

import {
  PaginationQuery,
  PaginationResponse,
} from '../../shared/services/pagination/pagination.interface';
import {
  PaginationDelegate,
  PaginationService,
} from '../../shared/services/pagination/pagination.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Category } from '@prisma/client';

import { CreateFullCategoryDto } from './dto/create-full-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService extends PaginationService<Category> {
  constructor(public prismaService: PrismaService) {
    super(prismaService.category as unknown as PaginationDelegate<Category>, {
      defaultSortBy: 'id',
      allowedSortFields: ['id', 'name', 'slug', 'sortOrder', 'createdAt'],
      allowedSearchFields: ['name', 'slug', 'description'],
    });
  }

  create(createCategoryDto: CreateFullCategoryDto) {
    const { category, subcategories } = createCategoryDto;

    return this.prismaService.$transaction(async (prisma) => {
      const created = await prisma.category.create({
        data: category,
      });

      const categoryId = created.id;
      if (!subcategories || !subcategories.length) return created;

      await prisma.subcategory.createMany({
        data: subcategories.map((subcategory) => ({
          ...subcategory,
          name: String(subcategory.name),
          description: String(subcategory.description),
          slug: String(subcategory.slug),
          icon: String(subcategory.icon),
          categoryId,
        })),
      });
      return created;
    });
  }

  async findAll(query: PaginationQuery): Promise<PaginationResponse<Category>> {
    return this.listPaginated(query, { isActive: true });
  }

  findOne(id: number) {
    return this.prismaService.category.findFirst({
      where: { id, isActive: true },
      include: {
        subcategories: { where: { isActive: true } },
      },
    });
  }

  update(id: number, updateCategoryDto: UpdateCategoryDto) {
    return this.prismaService.category.update({
      where: { id },
      data: updateCategoryDto,
    });
  }

  remove(id: number) {
    return this.prismaService.category.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
