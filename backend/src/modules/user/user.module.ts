import { forwardRef, Module } from '@nestjs/common';

import { UserValidateService } from './user-validate.service';
import { AddressModule } from '../address/address.module';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  imports: [
    forwardRef(() => AddressModule)
  ],
  controllers: [UserController],
  providers: [UserService, UserValidateService],
  exports: [UserService, UserValidateService]
})
export class UserModule {}
