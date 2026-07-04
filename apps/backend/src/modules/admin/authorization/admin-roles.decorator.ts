import { SetMetadata } from '@nestjs/common';
import { AdminRole } from '@prisma/client';

import { AdminCapability } from './admin-permissions';

export const ADMIN_ROLES_KEY = 'adminRoles';
export const ADMIN_CAPABILITIES_KEY = 'adminCapabilities';

export const AdminRoles = (...roles: AdminRole[]) =>
  SetMetadata(ADMIN_ROLES_KEY, roles);

export const AdminPermissions = (...capabilities: AdminCapability[]) =>
  SetMetadata(ADMIN_CAPABILITIES_KEY, capabilities);
