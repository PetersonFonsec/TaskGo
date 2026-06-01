import { IsString, Length } from 'class-validator';

export class ConfirmPhoneVerificationDto {
  @IsString()
  @Length(4, 10)
  verificationCode: string;
}
