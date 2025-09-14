import { IsArray, IsNotEmptyObject, IsOptional, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

import { CreateUserDto } from "src/modules/user/dto/create-user.dto";

export class AuthRegisterProviderDTO  {
  @IsNotEmptyObject()
  @ValidateNested()
  @Type(() => CreateUserDto)
  provider: CreateUserDto;

  @IsOptional()
  @IsArray()
  @Type(() => BigInt)
  services: bigint[];
}
