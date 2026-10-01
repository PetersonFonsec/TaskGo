import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
@Injectable()
export class SecurityMaintenanceService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(SecurityMaintenanceService.name);
  private timer?: ReturnType<typeof setInterval>;
  private running = false;
  constructor(private readonly prisma: PrismaService) {}
  onModuleInit() {
    if (process.env.NODE_ENV === 'test') return;
    this.timer = setInterval(() => {
      void this.sweep();
    }, 60000);
    this.timer.unref();
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
  async sweep() {
    if (this.running) return;
    this.running = true;
    try {
      await this.prisma
        .$executeRaw`DELETE FROM security_rate_limits WHERE expires_at < NOW() - interval '1 hour'`;
      await this.prisma
        .$executeRaw`DELETE FROM security_challenges WHERE expires_at < NOW()`;
    } catch {
      this.logger.error('Security maintenance failed');
    } finally {
      this.running = false;
    }
  }
}
