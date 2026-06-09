import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { FeatureFlagService } from './feature-flag.service';
import { CreateFeatureFlagDto } from './dto/create-feature-flag.dto';
import { UpdateFeatureFlagDto } from './dto/update-feature-flag.dto';

@Controller('feature-flag')
export class FeatureFlagController {
  constructor(private readonly featureFlagService: FeatureFlagService) {}

  @Post()
  create(@Body() createFeatureFlagDto: CreateFeatureFlagDto) {
    return this.featureFlagService.create(createFeatureFlagDto);
  }

  @Get()
  findAll() {
    return this.featureFlagService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.featureFlagService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateFeatureFlagDto: UpdateFeatureFlagDto) {
    return this.featureFlagService.update(+id, updateFeatureFlagDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.featureFlagService.remove(+id);
  }
}
