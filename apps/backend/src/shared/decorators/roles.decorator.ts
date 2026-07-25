import { SetMetadata, applyDecorators } from '@nestjs/common';
import { UserType } from '@prisma/client';

import type { CustomerRole } from '../auth/authenticated-identity';

export const CUSTOMER_ROLES_KEY = 'customerRoles';

export const Roles = (...roles: CustomerRole[]) =>
  SetMetadata(CUSTOMER_ROLES_KEY, roles);

export const ProviderOnly = () => applyDecorators(Roles(UserType.PRESTADOR));
