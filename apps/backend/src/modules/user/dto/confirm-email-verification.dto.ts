import { IsString, Length } from 'class-validator';

export class ConfirmEmailVerificationDto {
  @IsString()
  @Length(4, 10)
  verificationCode: string;
}
