import { IsNotEmpty } from "class-validator";

import { CreateAddressDto } from "src/modules/address/dto/create-address.dto";
import { CreateUserDto } from "src/modules/user/dto/create-user.dto";


export class AuthRegisterDTO  {
  @IsNotEmpty()
  user: CreateUserDto;

  @IsNotEmpty()
  address: CreateAddressDto;
}
