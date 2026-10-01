import { SafePassword } from '../../../../shared/security/password-policy';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class AdminChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @IsString()
  @MinLength(8)
  @SafePassword()
  newPassword: string;
}
