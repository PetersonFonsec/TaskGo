import { Controller, Get, Post, Delete, Param, Body, ParseIntPipe, ForbiddenException, UnauthorizedException, HttpCode, Req, NotFoundException } from '@nestjs/common';
import { Request } from 'express';
import { CreateFavoriteDto } from './dto/create-favorite.dto';
import { FavoritesService } from './favorites.service';
import { AuthTokenService } from '../auth/auth-token.service';
import { FeatureFlagService } from '../../shared/services/feature-flag.service';

@Controller('clients/:clientId/favorites')
export class FavoritesController {
  constructor(
    private readonly favoritesService: FavoritesService,
    private readonly authTokenService: AuthTokenService,
    private readonly featureFlagService: FeatureFlagService,
  ) {}

  private ensureFavoritesEnabled() {
    if (!this.featureFlagService.isFavoritesMvpEnabled()) {
      throw new NotFoundException('Favorites feature disabled');
    }
  }

  private extractClientIdFromAuth(req: Request) {
    const authorization = req.headers.authorization || req.headers.Authorization;
    if (!authorization || typeof authorization !== 'string') {
      throw new UnauthorizedException('Authentication required for favorites');
    }

    const parts = authorization.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new UnauthorizedException('Authentication token malformed');
    }

    const token = parts[1];
    this.authTokenService.checkToken(token);
    const decoded = this.authTokenService.decodeToken(token);
    const clientId = Number(decoded?.id);
    if (!clientId) {
      throw new UnauthorizedException('Authenticated client required for favorites');
    }

    return clientId;
  }

  @Post()
  @HttpCode(201)
  async addFavorite(
    @Param('clientId', ParseIntPipe) clientId: number,
    @Body() createFavoriteDto: CreateFavoriteDto,
    @Req() req: Request,
  ) {
    this.ensureFavoritesEnabled();
    const authClientId = this.extractClientIdFromAuth(req);
    if (authClientId !== clientId) {
      throw new ForbiddenException('Client ID does not match authenticated user');
    }

    return this.favoritesService.addFavorite(clientId, createFavoriteDto.providerId);
  }

  @Delete(':providerId')
  async removeFavorite(
    @Param('clientId', ParseIntPipe) clientId: number,
    @Param('providerId', ParseIntPipe) providerId: number,
    @Req() req: Request,
  ) {
    this.ensureFavoritesEnabled();
    const authClientId = this.extractClientIdFromAuth(req);
    if (authClientId !== clientId) {
      throw new ForbiddenException('Client ID does not match authenticated user');
    }

    return this.favoritesService.removeFavorite(clientId, providerId);
  }

  @Get()
  async listFavorites(
    @Param('clientId', ParseIntPipe) clientId: number,
    @Req() req: Request,
  ) {
    this.ensureFavoritesEnabled();
    const authClientId = this.extractClientIdFromAuth(req);
    if (authClientId !== clientId) {
      throw new ForbiddenException('Client ID does not match authenticated user');
    }

    return this.favoritesService.listFavorites(clientId);
  }
}
