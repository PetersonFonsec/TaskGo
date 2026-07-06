import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AdminRole } from '@prisma/client';

import {
  ADMIN_ACTOR_KEY,
  ADMIN_OPERATOR_KEY,
  AdminRequest,
} from '../auth/admin-actor';
import { IS_ADMIN_PUBLIC_KEY } from './admin-public.decorator';
import { AdminCapability, roleHasCapabilities } from './admin-permissions';
import {
  ADMIN_CAPABILITIES_KEY,
  ADMIN_ROLES_KEY,
} from './admin-roles.decorator';
import { AdminTelemetryService } from '../../../observability/admin-telemetry.service';

const ADMIN_ROLES = new Set(Object.values(AdminRole));
const ADMIN_CAPABILITIES = new Set(Object.values(AdminCapability));

@Injectable()
export class AdminRolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Optional() private readonly telemetry?: AdminTelemetryService,
  ) {}

  canActivate(context: ExecutionContext) {
    const isAdminPublic = this.reflector.getAllAndOverride<boolean>(
      IS_ADMIN_PUBLIC_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (isAdminPublic) return true;

    const roles = this.reflector.getAllAndOverride<AdminRole[]>(
      ADMIN_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    const capabilities = this.reflector.getAllAndOverride<AdminCapability[]>(
      ADMIN_CAPABILITIES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (roles && !this.hasValidRoles(roles)) {
      throw new ForbiddenException('Invalid administrative role metadata');
    }

    if (capabilities && !this.hasValidCapabilities(capabilities)) {
      throw new ForbiddenException(
        'Invalid administrative capability metadata',
      );
    }

    if (!roles && !capabilities) {
      throw new ForbiddenException('Administrative role metadata is required');
    }

    const request = context.switchToHttp().getRequest<AdminRequest>();
    const actor = request[ADMIN_ACTOR_KEY] ?? request[ADMIN_OPERATOR_KEY];
    if (!actor) {
      throw new ForbiddenException('Administrative actor is required');
    }

    if (roles?.includes(actor.role)) return true;
    if (capabilities && roleHasCapabilities(actor.role, capabilities)) {
      return true;
    }

    this.telemetry?.recordAuthorizationDenied(actor.role, request.path);
    throw new ForbiddenException('Administrative role is not authorized');
  }

  private hasValidRoles(roles: AdminRole[]) {
    return (
      Array.isArray(roles) &&
      roles.length > 0 &&
      roles.every((role) => ADMIN_ROLES.has(role))
    );
  }

  private hasValidCapabilities(capabilities: AdminCapability[]) {
    return (
      Array.isArray(capabilities) &&
      capabilities.length > 0 &&
      capabilities.every((capability) => ADMIN_CAPABILITIES.has(capability))
    );
  }
}
