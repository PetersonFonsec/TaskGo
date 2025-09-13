import { Injectable } from '@nestjs/common';

import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateFullCategoryDto } from './dto/create-full-category.dto';
import { PrismaService } from '@prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private readonly prismaService: PrismaService) { }

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

  findAll() {
    return this.prismaService.category.findMany({
      include: {
        subcategories: true,
      },
    });
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
    return `This action removes a #${id} category`;
  }
}
