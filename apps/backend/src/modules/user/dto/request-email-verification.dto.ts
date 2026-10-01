import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { IsEmail } from 'class-validator';

export class RequestEmailVerificationDto {
  @IsString() @IsNotEmpty() @MaxLength(72) currentPassword: string;
  @IsEmail()
  email: string;
}
