import { Injectable } from '@nestjs/common';

import { PaginationQuery, PaginationResponse } from '@shared/services/pagination/pagination.interface';
import { PaginationService } from '@shared/services/pagination/pagination.service';
import { PrismaService } from '@prisma/prisma.service';
import { Category } from '@prisma/client';

import { CreateFullCategoryDto } from './dto/create-full-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService extends PaginationService<Category> {
  constructor(public prismaService: PrismaService) {
    super(prismaService);
    this.modelName = this.prismaService.category;
  }

  create(createCategoryDto: CreateFullCategoryDto) {
    const { category, subcategories } = createCategoryDto;

    this.prismaService.$transaction(async prisma => {
      const { id: categoryId } = await prisma.category.create({
        data: category
      });

      if (!subcategories || !subcategories.length) return;

      await prisma.subcategory.createMany({
        data: subcategories.map(subcategory => ({
          ...subcategory,
          name: String(subcategory.name),
          description: String(subcategory.description),
          slug: String(subcategory.slug),
          icon: String(subcategory.icon),
          categoryId,
        })),
      });

    });
  }

  async findAll(query: PaginationQuery): Promise<PaginationResponse<Category>> {
    const queryDefault: PaginationQuery = { page: 1, limit: 10, sortBy: 'id', order: 'desc', search: '' };
    return await this.listPaginated(Object.assign(queryDefault, query));
  }

  findOne(id: number) {
    return this.prismaService.category.findUnique({
      where: { id },
      include: {
        subcategories: true,
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
    return this.prismaService.category.delete({
      where: { id },
    });
  }
}
