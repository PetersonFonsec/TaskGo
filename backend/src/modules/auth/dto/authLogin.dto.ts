import { IsEmail } from "class-validator";

export class AuthLoginDTO {
  @IsEmail()
  email: string;
  password: string;
}
