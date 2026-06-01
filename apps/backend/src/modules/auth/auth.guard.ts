import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Reflector } from '@nestjs/core';

import { AuthTokenService } from './auth-token.service';
import { IS_PUBLIC_KEY } from '../../shared/decorators/public.decorator';

export const TOKEN_KEY = 'token';

@Injectable()
export class AuthGuard implements CanActivate {

  constructor(
    private authTokenService: AuthTokenService,
    private reflector: Reflector,
  ) { }

  /**
   * @description Checks se a rota é pública caso contrario ele valida o token.
   */
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest();
    const authorization = req.headers?.authorization;
    if (!authorization || typeof authorization !== 'string') {
      throw new UnauthorizedException('Authentication token required');
    }

    const parts = authorization.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new UnauthorizedException('Authentication token malformed');
    }

    const token = parts[1];

    this.authTokenService.checkToken(token);
    req[TOKEN_KEY] = this.authTokenService.decodeToken(token);
    return true;
  }

}
