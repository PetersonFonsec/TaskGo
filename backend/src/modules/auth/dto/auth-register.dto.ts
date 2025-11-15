import { IsArray, IsOptional, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

import { CreateUserDto } from "src/modules/user/dto/create-user.dto";

export class AuthRegisterDTO  {
  @ValidateNested()
  @Type(() => CreateUserDto)
  user: CreateUserDto;

  @IsOptional()
  @IsArray()
  @Type(() => BigInt)
  services: bigint[];
}
