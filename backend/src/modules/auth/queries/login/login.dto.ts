import { IsEmail, IsNotEmpty, IsString } from "class-validator";

export class AuthLoginDTO {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
