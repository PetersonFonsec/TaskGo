import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsOptional,
  Matches,
  MaxLength,
} from 'class-validator';
import type { AuthLoginRequest } from '@taskgo/shared';

export class AdminAuthLoginDto implements AuthLoginRequest {
  @IsOptional() @Matches(/^\d{6}$/) otp?: string;
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(72)
  password: string;
}
