import { IsNotEmpty, MaxLength } from 'class-validator';
import { IsString, Matches } from 'class-validator';

export class RequestPhoneVerificationDto {
  @IsString() @IsNotEmpty() @MaxLength(72) currentPassword: string;
  @IsString()
  @Matches(/^\+?[0-9\s\-()]{7,20}$/)
  phone: string;
}
