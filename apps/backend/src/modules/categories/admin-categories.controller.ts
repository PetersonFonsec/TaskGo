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
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  IsBoolean,
  IsNotEmpty,
  ValidateIf,
  IsString,
  MaxLength,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { PartialType } from '@nestjs/swagger';
import { randomUUID } from 'crypto';
import { Public } from '../../shared/decorators/public.decorator';
import { PaginationQuery } from '../../shared/services/pagination/pagination.interface';
import { AdminAuthGuard } from '../admin/auth/admin-auth.guard';
import { AdminRolesGuard } from '../admin/authorization/admin-roles.guard';
import { AdminPermissions } from '../admin/authorization/admin-roles.decorator';
import { AdminCapability } from '../admin/authorization/admin-permissions';
import { CategoriesService } from './categories.service';

export class AdminCreateCategoryDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(2048)
  @Matches(/^(https?:\/\/[^\s]+|)$/i, {
    message: 'Informe uma URL HTTP ou HTTPS para a thumbnail.',
  })
  thumb?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  isActive?: boolean;
}
export class AdminUpdateCategoryDto extends PartialType(
  AdminCreateCategoryDto,
  { skipNullProperties: false },
) {}

@Public()
@UseGuards(AdminAuthGuard, AdminRolesGuard)
@AdminPermissions(AdminCapability.ManageCatalog)
@Controller('admin/categories')
export class AdminCategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  list(@Query() query: PaginationQuery) {
    return this.categories.listPaginated(query);
  }

  @Post()
  create(@Body() body: AdminCreateCategoryDto) {
    return this.categories.prismaService.category.create({
      data: {
        name: body.name,
        thumb: body.thumb || null,
        isActive: body.isActive ?? true,
        slug: `${
          body.name
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '') || 'categoria'
        }-${randomUUID()}`,
      },
    });
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: AdminUpdateCategoryDto) {
    try {
      return await this.categories.prismaService.category.update({
        where: { id: this.id(id) },
        data: {
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.thumb !== undefined ? { thumb: body.thumb || null } : {}),
          ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        },
      });
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const current = await this.categories.prismaService.category.findUnique({
      where: { id: this.id(id) },
    });
    if (!current) throw new NotFoundException('Categoria não encontrada.');
    const linkedService = await this.categories.prismaService.service.findFirst(
      { where: { category: current.slug }, select: { id: true } },
    );
    if (linkedService)
      throw new ConflictException(
        'A categoria possui serviços vinculados. Desabilite a categoria.',
      );
    try {
      return await this.categories.prismaService.category.delete({
        where: { id: this.id(id), subcategories: { none: {} } },
      });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2025') {
        const exists = await this.categories.prismaService.category.findUnique({
          where: { id: this.id(id) },
        });
        if (exists)
          throw new ConflictException(
            'A categoria possui subcategorias. Remova os vínculos ou desabilite a categoria.',
          );
      }
      this.rethrow(error);
    }
  }

  private id(value: string): bigint {
    if (!/^[1-9]\d*$/.test(value))
      throw new BadRequestException('Categoria inválida.');
    return BigInt(value);
  }
  private rethrow(error: unknown): never {
    if ((error as { code?: string }).code === 'P2025')
      throw new NotFoundException('Categoria não encontrada.');
    if ((error as { code?: string }).code === 'P2003')
      throw new ConflictException(
        'Categoria possui vínculos e não pode ser excluída.',
      );
    throw error;
  }
}
