import { Injectable } from '@nestjs/common';

@Injectable()
export class FeatureFlagService {
  isFavoritesMvpEnabled(): boolean {
    const flag = process.env.FAVORITES_MVP ?? process.env.favorites_mvp;
    return flag !== 'false';
  }
}
