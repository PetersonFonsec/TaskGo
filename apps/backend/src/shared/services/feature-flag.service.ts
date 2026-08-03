import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FeatureFlagService {
  constructor(private readonly configService: ConfigService) {}

  isFavoritesMvpEnabled(): boolean {
    return this.configService.getOrThrow<boolean>('app.favoritesMvpEnabled');
  }
}
