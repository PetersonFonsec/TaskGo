import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { UserValidateService } from './user-validate.service';

@Module({
  controllers: [UserController],
  providers: [UserService, UserValidateService],
  exports: [UserService, UserValidateService]
})
export class UserModule {}
