import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { AuthTokenService } from './auth-token.service';
import { IS_PUBLIC_KEY } from '../../shared/decorators/public.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AuthenticatedIdentity,
  isCustomerRole,
} from '../../shared/auth/authenticated-identity';

export const TOKEN_KEY = 'token';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private authTokenService: AuthTokenService,
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  /**
   * @description Checks se a rota é pública caso contrario ele valida o token.
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
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

    const payload = this.authTokenService.checkToken(token) as {
      id?: unknown;
      sub?: unknown;
    };
    const id = payload?.id ?? payload?.sub;
    if (typeof id !== 'string' || !/^[1-9]\d*$/.test(id)) {
      throw new UnauthorizedException('Invalid authentication identity');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: BigInt(id) },
      select: { id: true, type: true },
    });
    if (!user || !isCustomerRole(user.type)) {
      throw new UnauthorizedException('Invalid authentication identity');
    }

    const identity: AuthenticatedIdentity = {
      id: user.id.toString(),
      role: user.type,
    };
    req[TOKEN_KEY] = identity;
    return true;
  }
}
