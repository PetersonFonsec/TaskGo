import { ConflictException, NotFoundException } from '@nestjs/common';
import {
  AdminCategoriesController,
  AdminCreateCategoryDto,
  AdminUpdateCategoryDto,
} from './admin-categories.controller';
import { CategoriesService } from './categories.service';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

describe('AdminCategoriesController', () => {
  const category = {
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findUnique: jest.fn(),
  };
  const listPaginated = jest.fn();
  const subcategory = { groupBy: jest.fn() };
  const controller = new AdminCategoriesController({
    prismaService: {
      category,
      subcategory,
      service: { findFirst: jest.fn().mockResolvedValue(null) },
    },
    listPaginated,
  } as unknown as CategoriesService);
  beforeEach(() => {
    jest.clearAllMocks();
    category.delete.mockReset();
    category.findUnique.mockResolvedValue({ id: 12n, slug: 'limpeza' });
  });
  it('lists inactive categories as well as active categories', async () => {
    listPaginated.mockResolvedValue({ data: [], meta: { total: 0 } });
    await controller.list({ page: 2 });
    expect(listPaginated).toHaveBeenCalledWith({ page: 2 });
    expect(subcategory.groupBy).not.toHaveBeenCalled();
  });
  it('counts total and active services of each listed category', async () => {
    const meta = { total: 2, page: 1 };
    listPaginated.mockResolvedValue({
      data: [
        { id: 1n, name: 'Limpeza' },
        { id: 2n, name: 'Mecânica' },
      ],
      meta,
    });
    subcategory.groupBy.mockResolvedValue([
      { categoryId: 1n, isActive: true, _count: { _all: 3 } },
      { categoryId: 1n, isActive: false, _count: { _all: 2 } },
    ]);
    const result = await controller.list({});
    expect(subcategory.groupBy).toHaveBeenCalledWith({
      by: ['categoryId', 'isActive'],
      where: { categoryId: { in: [1n, 2n] } },
      _count: { _all: true },
    });
    expect(result).toEqual({
      meta,
      data: [
        {
          id: 1n,
          name: 'Limpeza',
          servicesCount: 5,
          activeServicesCount: 3,
        },
        {
          id: 2n,
          name: 'Mecânica',
          servicesCount: 0,
          activeServicesCount: 0,
        },
      ],
    });
  });
  it('creates categories with a thumbnail and chosen status', async () => {
    await controller.create({
      name: 'Limpeza',
      thumb: 'https://example.com/image.jpg',
      isActive: false,
    });
    expect(category.create).toHaveBeenCalledWith({
      data: {
        name: 'Limpeza',
        thumb: 'https://example.com/image.jpg',
        isActive: false,
        slug: expect.stringMatching(/^limpeza-/),
      },
    });
  });
  it('changes name, clears thumbnail and enables a category without changing its slug', async () => {
    await controller.update('12', {
      name: 'Novo nome',
      thumb: '',
      isActive: true,
    });
    expect(category.update).toHaveBeenCalledWith({
      where: { id: 12n },
      data: { name: 'Novo nome', thumb: null, isActive: true },
    });
  });
  it('only deletes categories without subcategories', async () => {
    await controller.remove('12');
    expect(category.delete).toHaveBeenCalledWith({
      where: { id: 12n, subcategories: { none: {} } },
    });
  });
  it('reports conflict for a linked category', async () => {
    category.delete.mockRejectedValue({ code: 'P2025' });
    category.findUnique.mockResolvedValue({ id: 12n });
    await expect(controller.remove('12')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
  it('reports missing categories', async () => {
    category.update.mockRejectedValue({ code: 'P2025' });
    await expect(
      controller.update('12', { isActive: false }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
  it('rejects empty names, unsafe thumbnails and invalid statuses', async () => {
    const errors = await validate(
      plainToInstance(AdminCreateCategoryDto, {
        name: '  ',
        thumb: 'javascript:alert(1)',
        isActive: 'false',
      }),
    );
    expect(errors.map((error) => error.property).sort()).toEqual([
      'isActive',
      'name',
      'thumb',
    ]);
    expect(
      await validate(
        plainToInstance(AdminUpdateCategoryDto, { isActive: false }),
      ),
    ).toEqual([]);
  });
});
