import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import {
  ADMIN_ACTOR_KEY,
  ADMIN_OPERATOR_KEY,
  AdminRequest,
  toAdminActor,
} from './admin-actor';
import { IS_ADMIN_PUBLIC_KEY } from '../authorization/admin-public.decorator';
import { AdminAuthService } from './admin-auth.service';
import { AdminAuthTokenService } from './admin-auth-token.service';

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(
    private readonly tokenService: AdminAuthTokenService,
    private readonly authService: AdminAuthService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext) {
    const isAdminPublic = this.reflector.getAllAndOverride<boolean>(
      IS_ADMIN_PUBLIC_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (isAdminPublic) return true;

    const request = context.switchToHttp().getRequest<AdminRequest>();
    const token = this.extractBearerToken(request);
    const payload = this.tokenService.verify(token);
    const operator = await this.authService.validatePayload(payload);
    const actor = toAdminActor(operator);

    request[ADMIN_ACTOR_KEY] = actor;
    request[ADMIN_OPERATOR_KEY] = actor;
    return true;
  }

  private extractBearerToken(request: AdminRequest) {
    const authorization = request.headers.authorization;
    if (!authorization || typeof authorization !== 'string') {
      throw new UnauthorizedException(
        'Administrative authentication token required',
      );
    }

    const [type, token] = authorization.split(' ');
    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException(
        'Administrative authentication token malformed',
      );
    }

    return token;
  }
}
