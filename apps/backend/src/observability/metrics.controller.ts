import {
  Controller,
  Get,
  Header,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import { Public } from '../shared/decorators/public.decorator';
import { AdminTelemetryService } from './admin-telemetry.service';
@Controller()
export class MetricsController {
  constructor(
    private readonly telemetry: AdminTelemetryService,
    private readonly config: ConfigService,
  ) {}
  @Public()
  @Get('metrics')
  @Header('content-type', 'text/plain; version=0.0.4; charset=utf-8')
  getMetrics(@Headers('authorization') authorization?: string) {
    const secret = this.config.get<string>('METRICS_TOKEN');
    const expected = Buffer.from(`Bearer ${secret ?? ''}`);
    const actual = Buffer.from(authorization ?? '');
    if (
      !secret ||
      expected.length !== actual.length ||
      !timingSafeEqual(expected, actual)
    )
      throw new UnauthorizedException('Metrics credentials required');
    return this.telemetry.renderPrometheusMetrics();
  }
}
