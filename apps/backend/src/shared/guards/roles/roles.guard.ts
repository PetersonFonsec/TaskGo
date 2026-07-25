import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { TOKEN_KEY } from '../../../modules/auth/auth.guard';
import {
  AuthenticatedIdentity,
  isCustomerRole,
} from '../../auth/authenticated-identity';
import { CUSTOMER_ROLES_KEY } from '../../decorators/roles.decorator';
import { IS_PUBLIC_KEY } from '../../decorators/public.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_KEY,
      targets,
    );
    if (isPublic) return true;

    const requiredRoles = this.reflector.getAllAndOverride<unknown>(
      CUSTOMER_ROLES_KEY,
      targets,
    );

    if (requiredRoles === undefined) return true;
    if (
      !Array.isArray(requiredRoles) ||
      requiredRoles.length === 0 ||
      !requiredRoles.every(isCustomerRole)
    ) {
      return false;
    }

    const request = context.switchToHttp().getRequest<{
      [TOKEN_KEY]?: Partial<AuthenticatedIdentity>;
    }>();
    const identity = request[TOKEN_KEY];
    if (
      !identity ||
      typeof identity.id !== 'string' ||
      !/^[1-9]\d*$/.test(identity.id) ||
      !isCustomerRole(identity.role)
    ) {
      return false;
    }

    return requiredRoles.includes(identity.role);
  }
}
