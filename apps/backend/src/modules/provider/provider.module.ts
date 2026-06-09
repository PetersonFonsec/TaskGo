import { forwardRef, Module } from '@nestjs/common';

import { ProviderController } from './provider.controller';
import { ProviderService } from './provider.service';

import { ServicesModule } from '../services/services.module';
import { UserModule } from '../user/user.module';
import { AuthModule } from '../auth/auth.module';
import { SharedModule } from '../../shared/shared.module';
import { FavoritesController } from './favorites/favorites.controller';
import { FavoritesService } from './favorites/favorites.service';

@Module({
  imports: [
    forwardRef(() => UserModule),
    forwardRef(() => ServicesModule),
    forwardRef(() => AuthModule),
    SharedModule,
  ],
  controllers: [ProviderController, FavoritesController],
  providers: [ProviderService, FavoritesService],
  exports: [ProviderService, FavoritesService],
})
export class ProviderModule {}
