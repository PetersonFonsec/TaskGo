import { IsEnum } from 'class-validator';
import { AdminRole } from '@prisma/client';

export class UpdateAdminRoleDto {
  @IsEnum(AdminRole)
  role: AdminRole;
}
