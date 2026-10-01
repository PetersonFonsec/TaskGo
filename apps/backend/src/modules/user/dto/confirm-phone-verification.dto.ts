import { IsString, Matches } from 'class-validator';

export class ConfirmPhoneVerificationDto {
  @IsString()
  @Matches(/^\d{6}$/)
  verificationCode: string;
}
