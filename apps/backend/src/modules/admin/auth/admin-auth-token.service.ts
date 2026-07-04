import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AdminRole } from '@prisma/client';

export const ADMIN_TOKEN_KIND = 'admin';

export interface AdminTokenPayload {
  sub: string;
  tokenKind: typeof ADMIN_TOKEN_KIND;
  role: AdminRole;
  ver: number;
}

const ADMIN_ROLES = new Set(Object.values(AdminRole));

@Injectable()
export class AdminAuthTokenService {
  constructor(private readonly jwtService: JwtService) {}

  createToken(operator: { id: bigint; role: AdminRole; tokenVersion: number }) {
    const subject = operator.id.toString();
    const payload: AdminTokenPayload = {
      sub: subject,
      tokenKind: ADMIN_TOKEN_KIND,
      role: operator.role,
      ver: operator.tokenVersion,
    };

    const access_token = this.jwtService.sign(payload, {
      expiresIn: process.env.EXPIRES_IN,
    });

    return { access_token };
  }

  verify(token: string): AdminTokenPayload {
    try {
      const payload = this.jwtService.verify<AdminTokenPayload>(token);
      if (
        payload?.tokenKind !== ADMIN_TOKEN_KIND ||
        typeof payload.sub !== 'string' ||
        !ADMIN_ROLES.has(payload.role) ||
        typeof payload.ver !== 'number'
      ) {
        throw new UnauthorizedException(
          'Invalid administrative authentication token',
        );
      }

      return payload;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException(
        'Invalid or expired administrative authentication token',
      );
    }
  }
}
