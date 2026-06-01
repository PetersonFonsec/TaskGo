import { IsString, Matches } from 'class-validator';

export class RequestPhoneVerificationDto {
  @IsString()
  @Matches(/^\+?[0-9\s\-()]{7,20}$/)
  phone: string;
}
