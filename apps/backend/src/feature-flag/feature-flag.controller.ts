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
import { FeatureFlagService } from './feature-flag.service';
import { CreateFeatureFlagDto } from './dto/create-feature-flag.dto';
import { UpdateFeatureFlagDto } from './dto/update-feature-flag.dto';

import { Public } from '../shared/decorators/public.decorator';
import { AdminAuthGuard } from '../modules/admin/auth/admin-auth.guard';
import { AdminRolesGuard } from '../modules/admin/authorization/admin-roles.guard';
import { AdminPermissions } from '../modules/admin/authorization/admin-roles.decorator';
import { AdminCapability } from '../modules/admin/authorization/admin-permissions';
import { PaginationQuery } from '../shared/services/pagination/pagination.interface';

@Public()
@UseGuards(AdminAuthGuard, AdminRolesGuard)
@AdminPermissions(AdminCapability.ManageFeatureFlags)
@Controller('admin/feature-flags')
export class FeatureFlagController {
  constructor(private readonly featureFlagService: FeatureFlagService) {}

  @Post()
  create(@Body() createFeatureFlagDto: CreateFeatureFlagDto) {
    return this.featureFlagService.create(createFeatureFlagDto);
  }

  @Get()
  findAll(@Query() query: PaginationQuery) {
    return this.featureFlagService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.featureFlagService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateFeatureFlagDto: UpdateFeatureFlagDto,
  ) {
    return this.featureFlagService.update(id, updateFeatureFlagDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.featureFlagService.remove(id);
  }
}
