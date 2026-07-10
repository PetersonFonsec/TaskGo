import { IsEmail, IsNotEmpty, IsString } from "class-validator";
import type { AuthLoginRequest } from '@taskgo/shared';

export class AuthLoginDTO implements AuthLoginRequest {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
