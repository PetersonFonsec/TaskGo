import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Injectable,
} from '@nestjs/common';

/** Single-process MVP limiter; the reverse proxy must enforce a shared limit when scaled. */
@Injectable()
export class RecoveryRateLimitGuard implements CanActivate {
  private readonly buckets = new Map<
    string,
    { count: number; expires: number }
  >();
  canActivate(context: ExecutionContext) {
    const now = Date.now();
    const request = context.switchToHttp().getRequest();
    const key = String(
      request.ip ?? request.socket?.remoteAddress ?? 'unknown',
    );
    for (const [ip, entry] of this.buckets)
      if (entry.expires <= now) this.buckets.delete(ip);
    let entry = this.buckets.get(key);
    if (!entry) {
      if (this.buckets.size >= 10000)
        throw new HttpException('Tente novamente mais tarde', 429);
      entry = { count: 0, expires: now + 60000 };
      this.buckets.set(key, entry);
    }
    if (++entry.count > 5)
      throw new HttpException(
        'Aguarde um minuto antes de tentar novamente',
        429,
      );
    return true;
  }
}
