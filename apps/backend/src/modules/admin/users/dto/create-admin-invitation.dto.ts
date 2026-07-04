import { IsEmail, IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { AdminRole } from '@prisma/client';

export class CreateAdminInvitationDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @IsEnum(AdminRole)
  role: AdminRole;
}

export class ActivateAdminInvitationDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @MinLength(8)
  password: string;
}
