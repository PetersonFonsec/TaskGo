import { AdminAuthModule } from '../admin/auth/admin-auth.module';
import { CategoryImagesController } from './category-images.controller';
import { Module } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { AdminCategoriesController } from './admin-categories.controller';
import { CategoriesController } from './categories.controller';

@Module({
  imports: [AdminAuthModule],
  controllers: [
    CategoriesController,
    AdminCategoriesController,
    CategoryImagesController,
  ],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
