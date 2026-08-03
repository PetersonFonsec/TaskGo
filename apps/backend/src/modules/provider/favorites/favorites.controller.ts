import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  HttpCode,
  UseGuards,
  UseInterceptors,
  Param,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { User } from '@taskgo/backend/shared/decorators/user.decorator';
import { FeatureFlagInterceptor } from '@taskgo/backend/shared/interceptors/feature-flag/feature-flag.interceptor';
import { AuthGuard } from '../../auth/auth.guard';
import { CreateFavoriteDto } from '../dto/create-favorite.dto';
import { AddFavoriteCommand, RemoveFavoriteCommand } from './commands';
import { ListFavoritesQuery } from './queries';
import { ParseBigIntPipe } from '../../../shared/pipes/parse-bigint.pipe';

@Controller('/favorites')
@UseGuards(AuthGuard)
export class FavoritesController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @HttpCode(201)
  @UseInterceptors(FeatureFlagInterceptor)
  async addFavorite(
    @User('id') clientId: string,
    @Body() createFavoriteDto: CreateFavoriteDto,
  ) {
    return this.commandBus.execute(
      new AddFavoriteCommand(
        BigInt(clientId),
        BigInt(createFavoriteDto.providerId),
      ),
    );
  }

  @Delete(':providerId')
  @UseInterceptors(FeatureFlagInterceptor)
  async removeFavorite(
    @User('id') clientId: string,
    @Param('providerId', ParseBigIntPipe) providerId: bigint,
  ) {
    return this.commandBus.execute(
      new RemoveFavoriteCommand(BigInt(clientId), providerId),
    );
  }

  @Get()
  async listFavorites(@User('id') clientId: string) {
    return this.queryBus.execute(new ListFavoritesQuery(BigInt(clientId)));
  }
}
