import { AdminAuthGuard } from '../admin/auth/admin-auth.guard';
import { AdminRolesGuard } from '../admin/authorization/admin-roles.guard';
import { AdminPermissions } from '../admin/authorization/admin-roles.decorator';
import { AdminCapability } from '../admin/authorization/admin-permissions';
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';

import { CategoriesService } from './categories.service';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateFullCategoryDto } from './dto/create-full-category.dto';
import { Public } from '../../shared/decorators/public.decorator';

import { PaginationQuery } from '../../shared/services/pagination/pagination.interface';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Public()
  @UseGuards(AdminAuthGuard, AdminRolesGuard)
  @AdminPermissions(AdminCapability.ManageCatalog)
  @Post()
  create(@Body() createCategoryDto: CreateFullCategoryDto) {
    return this.categoriesService.create(createCategoryDto);
  }

  @Public()
  @Get()
  findAll(@Query() query: PaginationQuery) {
    return this.categoriesService.findAll(query);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(+id);
  }

  @Public()
  @UseGuards(AdminAuthGuard, AdminRolesGuard)
  @AdminPermissions(AdminCapability.ManageCatalog)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(+id, updateCategoryDto);
  }

  @Public()
  @UseGuards(AdminAuthGuard, AdminRolesGuard)
  @AdminPermissions(AdminCapability.ManageCatalog)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.categoriesService.remove(+id);
  }
}
