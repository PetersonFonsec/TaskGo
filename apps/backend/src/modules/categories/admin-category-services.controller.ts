import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { randomUUID } from 'crypto';
import { Public } from '../../shared/decorators/public.decorator';
import { AdminAuthGuard } from '../admin/auth/admin-auth.guard';
import { AdminRolesGuard } from '../admin/authorization/admin-roles.guard';
import { AdminPermissions } from '../admin/authorization/admin-roles.decorator';
import { AdminCapability } from '../admin/authorization/admin-permissions';
import { CategoriesService } from './categories.service';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/**
 * Um "serviço" de uma categoria é uma subcategoria: é a lista que o
 * prestador escolhe no cadastro (passo "Serviços") e que vira os seus
 * serviços iniciais.
 */
export class AdminCreateCategoryServiceDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Informe o nome do serviço.' })
  @MaxLength(120)
  name: string;

  @Transform(trim)
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(500)
  description?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(0)
  @Max(9999)
  sortOrder?: number;

  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  isActive?: boolean;
}

export class AdminUpdateCategoryServiceDto extends PartialType(
  AdminCreateCategoryServiceDto,
  { skipNullProperties: false },
) {}

const SERVICE_FIELDS = {
  id: true,
  categoryId: true,
  name: true,
  slug: true,
  description: true,
  sortOrder: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Public()
@UseGuards(AdminAuthGuard, AdminRolesGuard)
@AdminPermissions(AdminCapability.ManageCatalog)
@Controller('admin/categories/:categoryId/services')
export class AdminCategoryServicesController {
  constructor(private readonly categories: CategoriesService) {}

  private get prisma() {
    return this.categories.prismaService;
  }

  @Get()
  async list(@Param('categoryId') categoryId: string) {
    const category = await this.category(categoryId);
    const data = await this.prisma.subcategory.findMany({
      where: { categoryId: category.id },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: SERVICE_FIELDS,
    });
    return { category, data };
  }

  @Post()
  async create(
    @Param('categoryId') categoryId: string,
    @Body() body: AdminCreateCategoryServiceDto,
  ) {
    const category = await this.category(categoryId);
    await this.ensureUniqueName(category.id, body.name);
    return this.prisma.subcategory.create({
      data: {
        categoryId: category.id,
        name: body.name,
        description: body.description || null,
        sortOrder: body.sortOrder ?? 0,
        isActive: body.isActive ?? true,
        slug: `${slugify(body.name)}-${randomUUID().slice(0, 8)}`,
      },
      select: SERVICE_FIELDS,
    });
  }

  @Patch(':serviceId')
  async update(
    @Param('categoryId') categoryId: string,
    @Param('serviceId') serviceId: string,
    @Body() body: AdminUpdateCategoryServiceDto,
  ) {
    const current = await this.service(categoryId, serviceId);
    if (body.name !== undefined)
      await this.ensureUniqueName(current.categoryId, body.name, current.id);
    return this.prisma.subcategory.update({
      where: { id: current.id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.description !== undefined
          ? { description: body.description || null }
          : {}),
        ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      },
      select: SERVICE_FIELDS,
    });
  }

  /**
   * Remover só tira o serviço da lista do cadastro. Os serviços que
   * prestadores já criaram a partir dele são cópias e continuam intactos.
   */
  @Delete(':serviceId')
  async remove(
    @Param('categoryId') categoryId: string,
    @Param('serviceId') serviceId: string,
  ) {
    const current = await this.service(categoryId, serviceId);
    return this.prisma.subcategory.delete({
      where: { id: current.id },
      select: SERVICE_FIELDS,
    });
  }

  private async category(value: string) {
    const category = await this.prisma.category.findUnique({
      where: { id: parseId(value, 'Categoria inválida.') },
      select: { id: true, name: true, isActive: true },
    });
    if (!category) throw new NotFoundException('Categoria não encontrada.');
    return category;
  }

  private async service(categoryId: string, serviceId: string) {
    const service = await this.prisma.subcategory.findFirst({
      where: {
        id: parseId(serviceId, 'Serviço inválido.'),
        categoryId: parseId(categoryId, 'Categoria inválida.'),
      },
      select: { id: true, categoryId: true },
    });
    if (!service) throw new NotFoundException('Serviço não encontrado.');
    return service;
  }

  private async ensureUniqueName(
    categoryId: bigint,
    name: string,
    ignoreId?: bigint,
  ) {
    const duplicate = await this.prisma.subcategory.findFirst({
      where: {
        categoryId,
        name: { equals: name, mode: 'insensitive' },
        ...(ignoreId ? { id: { not: ignoreId } } : {}),
      },
      select: { id: true },
    });
    if (duplicate)
      throw new ConflictException(
        'Já existe um serviço com esse nome nesta categoria.',
      );
  }
}

function parseId(value: string, message: string): bigint {
  if (!/^[1-9]\d*$/.test(value)) throw new BadRequestException(message);
  return BigInt(value);
}

function slugify(name: string): string {
  return (
    name
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'servico'
  );
}
