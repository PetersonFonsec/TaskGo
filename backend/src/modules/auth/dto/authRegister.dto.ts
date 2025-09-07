import { IsEmail, IsNotEmpty, IsString } from "class-validator";
import { CreateUserDto } from "src/modules/user/dto/create-user.dto";


export class AuthRegisterDTO extends CreateUserDto {
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  documentNumber: string;

  // @IsStrongPassword(rulesPassword)
  password: string;

  // @IsStrongPassword(rulesPassword)
  confirm_password: string;
}
