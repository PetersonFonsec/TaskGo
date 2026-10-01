import { IsString, Matches } from 'class-validator';

export class ConfirmEmailVerificationDto {
  @IsString()
  @Matches(/^\d{6}$/)
  verificationCode: string;
}
