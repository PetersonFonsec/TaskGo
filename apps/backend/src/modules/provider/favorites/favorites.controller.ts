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
  Query,
  BadRequestException,
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
  async listFavorites(
    @User('id') clientId: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const paging = {
      skip: this.parsePagingValue(skip, 'skip', 0),
      take: Math.min(this.parsePagingValue(take, 'take', 20), 100),
    };
    return this.queryBus.execute(
      new ListFavoritesQuery(BigInt(clientId), paging),
    );
  }

  private parsePagingValue(
    value: string | undefined,
    name: string,
    fallback: number,
  ) {
    if (value === undefined) return fallback;
    if (!/^\d+$/.test(value)) {
      throw new BadRequestException(
        `${name} deve ser um número inteiro não negativo`,
      );
    }
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed)) {
      throw new BadRequestException(`${name} está fora do limite permitido`);
    }
    return parsed;
  }
}
