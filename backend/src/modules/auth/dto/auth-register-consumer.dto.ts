import { ValidateNested } from "class-validator";
import { Type } from "class-transformer";

import { CreateUserDto } from "src/modules/user/dto/create-user.dto";

export class AuthRegisterConsumerDTO  {
  @ValidateNested()
  @Type(() => CreateUserDto)
  user: CreateUserDto;
}
