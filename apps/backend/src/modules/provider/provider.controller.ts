import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Req,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { Request } from 'express';
import { ProviderService } from './provider.service';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { ProviderAvailabilityQueryDto } from './dto/provider-availability.dto';
import { Public } from '../../shared/decorators/public.decorator';
import { AuthTokenService } from '../auth/auth-token.service';
import Mediator from '../../shared/events/mediator';
import { FeatureFlagService } from '../../shared/services/feature-flag.service';

@Controller('provider')
export class ProviderController {
  constructor(
    private readonly providerService: ProviderService,
    private readonly authTokenService: AuthTokenService,
    private readonly mediator: Mediator,
    private readonly featureFlagService: FeatureFlagService,
  ) {}

  @Post()
  create(@Body() createProviderDto: CreateProviderDto) {
    return this.providerService.create(createProviderDto);
  }

  @Public()
  @Get()
  async findAll(
    @Query('onlyFavorites') onlyFavorites?: string,
    @Req() req?: Request,
  ) {
    const onlyFavoritesEnabled = onlyFavorites === 'true';
    let clientId: number | undefined;

    if (
      onlyFavoritesEnabled &&
      !this.featureFlagService.isFavoritesMvpEnabled()
    ) {
      throw new NotFoundException('Favorites feature disabled');
    }

    if (onlyFavoritesEnabled) {
      const authorization =
        req?.headers?.authorization || req?.headers?.Authorization;
      if (!authorization || typeof authorization !== 'string') {
        throw new UnauthorizedException(
          'Authentication required for favorites filter',
        );
      }

      const parts = authorization.split(' ');
      if (parts.length !== 2 || parts[0] !== 'Bearer') {
        throw new UnauthorizedException('Authentication token malformed');
      }

      const token = parts[1];
      this.authTokenService.checkToken(token);
      const decoded = this.authTokenService.decodeToken(token);
      clientId = Number(decoded?.id);

      if (!clientId) {
        throw new UnauthorizedException(
          'Authenticated client required for favorites filter',
        );
      }
    }

    const providers = await this.providerService.findAll({
      onlyFavorites: onlyFavoritesEnabled,
      clientId,
    });

    if (onlyFavoritesEnabled) {
      await this.mediator.publish('favorites.searchFilter.used', {
        clientId,
        resultCount: Array.isArray(providers) ? providers.length : undefined,
        timestamp: new Date().toISOString(),
      });
    }

    return providers;
  }

  @Public()
  @Get(':id/availability')
  getAvailability(
    @Param('id') id: string,
    @Query() query: ProviderAvailabilityQueryDto,
  ) {
    return this.providerService.getAvailability(id, query);
  }

  @Public()
  @Get('by-category/:slug')
  findByCategory(@Param('slug') slug: string) {
    return this.providerService.findProvidersByCategorySlug(slug);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.providerService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateProviderDto: UpdateProviderDto,
  ) {
    return this.providerService.update(+id, updateProviderDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.providerService.remove(+id);
  }
}
