import { forwardRef, Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { UserValidateService } from './user-validate.service';
import { UserController } from './user.controller';
import { CommandHandlers } from './commands';
import { UserService } from './user.service';
import { QueryHandlers } from './queries';
import { CreateProviderStrategy } from './commands/create-user/strategies/create-provider.strategy';
import { CreateClientStrategy } from './commands/create-user/strategies/create-client.strategy';
import { CreateUserFactory } from './commands/create-user/factories/create-user.factory';

@Module({
  imports: [
    CqrsModule,
  ],
  controllers: [UserController],
  providers: [
    UserService,
    UserValidateService,
    ...QueryHandlers,
    ...CommandHandlers,
    CreateProviderStrategy,
    CreateClientStrategy,
    CreateUserFactory
  ],
  exports: [UserService, UserValidateService]
})
export class UserModule { }
