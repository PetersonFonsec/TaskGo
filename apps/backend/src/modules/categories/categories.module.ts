import { AdminAuthModule } from '../admin/auth/admin-auth.module';
import { CategoryImagesController } from './category-images.controller';
import { Module } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { AdminCategoriesController } from './admin-categories.controller';
import { AdminCategoryServicesController } from './admin-category-services.controller';
import { CategoriesController } from './categories.controller';

@Module({
  imports: [AdminAuthModule],
  controllers: [
    CategoriesController,
    AdminCategoriesController,
    AdminCategoryServicesController,
    CategoryImagesController,
  ],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
