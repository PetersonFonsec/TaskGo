import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { parseCorsOrigins } from '../../config/cors.config';
import {
  ADMIN_COOKIE,
  CUSTOMER_COOKIE,
  readSessionCookie,
} from './session-cookie';

@Injectable()
export class SecurityRateLimitGuard implements CanActivate {
  private readonly logger = new Logger(SecurityRateLimitGuard.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();
    const unsafe = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
    const origins = parseCorsOrigins({
      publicOrigins: this.config.get('app.publicOrigins'),
      backofficeOrigins: this.config.get('app.backofficeOrigins'),
    });
    const cookieAuth =
      !req.headers.authorization &&
      (readSessionCookie(req, CUSTOMER_COOKIE) ||
        readSessionCookie(req, ADMIN_COOKIE));
    if (
      unsafe &&
      ((req.headers.origin && !origins.includes(req.headers.origin)) ||
        (cookieAuth && !req.headers.origin))
    ) {
      if (this.config.get('app.nodeEnv') === 'production' || cookieAuth)
        throw new HttpException('Origem da requisição inválida', 403);
    }
    if (req.method === 'OPTIONS' || req.path === '/metrics' || req.path === '/')
      return true;
    const sensitive =
      /\/(?:login|register|activate|forget|reset-password|verify-email|verify-phone|confirm-email|confirm-phone|change-password)$/.test(
        req.path,
      ) ||
      (req.path === '/user' && req.method === 'POST');
    const email =
      typeof req.body?.email === 'string'
        ? req.body.email.trim().toLowerCase()
        : undefined;
    const ip = String(req.ip ?? req.socket?.remoteAddress ?? 'unknown');
    const budgets: [string, number, number][] = [[`ip:${ip}`, 120, 60000]];
    if (sensitive) {
      budgets.push([`sensitive:${ip}`, 10, 60000]);
      if (email) budgets.push([`account:${email}`, 10, 15 * 60000]);
    }
    for (const [identity, limit, windowMs] of budgets) {
      const key = createHash('sha256').update(identity).digest('hex');
      const rows = await this.prisma.$queryRaw<
        { count: number; retryAfter: number }[]
      >`
        INSERT INTO security_rate_limits (key, count, expires_at)
        VALUES (${key}, 1, NOW() + ${windowMs} * interval '1 millisecond')
        ON CONFLICT (key) DO UPDATE SET
          count = CASE WHEN security_rate_limits.expires_at <= NOW() THEN 1 ELSE security_rate_limits.count + 1 END,
          expires_at = CASE WHEN security_rate_limits.expires_at <= NOW() THEN NOW() + ${windowMs} * interval '1 millisecond' ELSE security_rate_limits.expires_at END
        RETURNING count, CEIL(EXTRACT(EPOCH FROM expires_at - NOW()))::int AS "retryAfter"
      `;
      if (rows[0].count > limit) {
        res.setHeader('Retry-After', Math.max(1, rows[0].retryAfter));
        this.logger.warn(
          JSON.stringify({
            event: 'security_rate_limit',
            route: req.route?.path ?? 'unknown',
          }),
        );
        throw new HttpException(
          'Muitas tentativas. Tente novamente mais tarde.',
          429,
        );
      }
    }
    return true;
  }
}
