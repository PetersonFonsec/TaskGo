import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  HttpCode,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FavoritesService } from './favorites.service';
import { User } from '@taskgo/backend/shared/decorators/user.decorator';
import { FeatureFlagInterceptor } from '@taskgo/backend/shared/interceptors/feature-flag/feature-flag.interceptor';
import { AuthGuard } from '../../auth/auth.guard';
import { CreateFavoriteDto } from '../dto/create-favorite.dto';

@Controller('/favorites')
@UseGuards(AuthGuard)
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Post()
  @HttpCode(201)
  @UseInterceptors(FeatureFlagInterceptor)
  async addFavorite(
    @User('id') clientId: number,
    @Body() createFavoriteDto: CreateFavoriteDto,
  ) {
    return this.favoritesService.addFavorite(
      clientId,
      createFavoriteDto.providerId,
    );
  }

  @Delete(':providerId')
  @UseInterceptors(FeatureFlagInterceptor)
  async removeFavorite(
    @User('id') clientId: number,
    @Body() createFavoriteDto: CreateFavoriteDto,
  ) {
    return this.favoritesService.removeFavorite(
      clientId,
      createFavoriteDto.providerId,
    );
  }

  @Get()
  async listFavorites(@User('id') clientId: number) {
    return this.favoritesService.listFavorites(clientId);
  }
}
