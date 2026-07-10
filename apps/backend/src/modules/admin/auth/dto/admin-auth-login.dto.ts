import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import type { AuthLoginRequest } from '@taskgo/shared';

export class AdminAuthLoginDto implements AuthLoginRequest {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
