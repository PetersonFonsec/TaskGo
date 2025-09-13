import { IsOptional, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

import { CreateAddressDto } from "src/modules/address/dto/create-address.dto";
import { CreateUserDto } from "src/modules/user/dto/create-user.dto";

export class AuthRegisterConsumerDTO  {
  @ValidateNested()
  @Type(() => CreateUserDto)
  user: CreateUserDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateAddressDto)
  address: CreateAddressDto;
}
