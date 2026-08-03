import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { ProviderController } from './provider.controller';
import { ProviderService } from './provider.service';

import { UserModule } from '../user/user.module';
import { AuthModule } from '../auth/auth.module';
import { SharedModule } from '../../shared/shared.module';
import { FavoritesController } from './favorites/favorites.controller';
import { ProviderCommandHandlers } from './commands';
import { ProviderQueryHandlers } from './queries';
import { FavoriteCommandHandlers } from './favorites/commands';
import { FavoriteQueryHandlers } from './favorites/queries';

@Module({
  imports: [UserModule, AuthModule, SharedModule, CqrsModule],
  controllers: [ProviderController, FavoritesController],
  providers: [
    ProviderService,
    ...ProviderCommandHandlers,
    ...ProviderQueryHandlers,
    ...FavoriteCommandHandlers,
    ...FavoriteQueryHandlers,
  ],
  exports: [ProviderService],
})
export class ProviderModule {}
