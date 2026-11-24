import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  AdminCategoryServicesController,
  AdminCreateCategoryServiceDto,
  AdminUpdateCategoryServiceDto,
} from './admin-category-services.controller';
import { CategoriesService } from './categories.service';

describe('AdminCategoryServicesController', () => {
  const category = { findUnique: jest.fn() };
  const subcategory = {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  const controller = new AdminCategoryServicesController({
    prismaService: { category, subcategory },
  } as unknown as CategoriesService);
  const limpeza = { id: 12n, name: 'Limpeza', isActive: true };

  beforeEach(() => {
    jest.resetAllMocks();
    category.findUnique.mockResolvedValue(limpeza);
    subcategory.findFirst.mockResolvedValue(null);
  });

  it('lists every service of the category, inactive included, in display order', async () => {
    const services = [{ id: 1n, name: 'Faxina', isActive: false }];
    subcategory.findMany.mockResolvedValue(services);
    await expect(controller.list('12')).resolves.toEqual({
      category: limpeza,
      data: services,
    });
    expect(subcategory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { categoryId: 12n },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
    );
  });

  it('reports a missing or invalid category', async () => {
    category.findUnique.mockResolvedValue(null);
    await expect(controller.list('99')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(controller.list('abc')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('creates a service in the category with a generated slug', async () => {
    await controller.create('12', { name: 'Faxina pós-obra' });
    expect(subcategory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          categoryId: 12n,
          name: 'Faxina pós-obra',
          description: null,
          sortOrder: 0,
          isActive: true,
          slug: expect.stringMatching(/^faxina-pos-obra-[0-9a-f]{8}$/),
        },
      }),
    );
  });

  it('rejects a duplicated name in the same category', async () => {
    subcategory.findFirst.mockResolvedValue({ id: 3n });
    await expect(
      controller.create('12', { name: 'faxina' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(subcategory.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          categoryId: 12n,
          name: { equals: 'faxina', mode: 'insensitive' },
        },
      }),
    );
    expect(subcategory.create).not.toHaveBeenCalled();
  });

  it('updates only the sent fields of a service of that category', async () => {
    subcategory.findFirst
      .mockResolvedValueOnce({ id: 5n, categoryId: 12n })
      .mockResolvedValueOnce(null);
    await controller.update('12', '5', {
      name: 'Diarista',
      description: '',
      isActive: false,
    });
    expect(subcategory.findFirst).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({ id: { not: 5n } }),
      }),
    );
    expect(subcategory.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 5n },
        data: { name: 'Diarista', description: null, isActive: false },
      }),
    );
  });

  it('does not touch a service from another category', async () => {
    await expect(
      controller.update('12', '5', { isActive: false }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(controller.remove('12', '5')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(subcategory.update).not.toHaveBeenCalled();
    expect(subcategory.delete).not.toHaveBeenCalled();
  });

  it('removes a service of the category', async () => {
    subcategory.findFirst.mockResolvedValue({ id: 5n, categoryId: 12n });
    await controller.remove('12', '5');
    expect(subcategory.delete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 5n } }),
    );
  });

  it('validates the payload', async () => {
    const create = (body: object) =>
      validate(plainToInstance(AdminCreateCategoryServiceDto, body));
    expect(await create({ name: '  ' })).not.toHaveLength(0);
    expect(await create({ name: 'a'.repeat(121) })).not.toHaveLength(0);
    expect(await create({ name: 'Faxina', sortOrder: -1 })).not.toHaveLength(0);
    expect(await create({ name: 'Faxina', isActive: 'sim' })).not.toHaveLength(
      0,
    );
    expect(
      await create({ name: 'Faxina', description: 'Limpeza completa' }),
    ).toHaveLength(0);
    expect(
      await validate(
        plainToInstance(AdminUpdateCategoryServiceDto, { isActive: true }),
      ),
    ).toHaveLength(0);
  });
});
