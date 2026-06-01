import { forwardRef, Module } from '@nestjs/common';

import { ProviderController } from './provider.controller';
import { FavoritesController } from './favorites.controller';
import { ProviderService } from './provider.service';
import { FavoritesService } from './favorites.service';

import { ServicesModule } from '../services/services.module';
import { UserModule } from '../user/user.module';
import { AuthModule } from '../auth/auth.module';
import { SharedModule } from '../../shared/shared.module';

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
