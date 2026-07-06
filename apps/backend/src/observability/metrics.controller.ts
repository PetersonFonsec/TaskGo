import { Controller, Get, Header } from '@nestjs/common';

import { Public } from '../shared/decorators/public.decorator';
import { AdminTelemetryService } from './admin-telemetry.service';

@Controller()
export class MetricsController {
  constructor(private readonly telemetry: AdminTelemetryService) {}

  @Public()
  @Get('metrics')
  @Header('content-type', 'text/plain; version=0.0.4; charset=utf-8')
  getMetrics() {
    return this.telemetry.renderPrometheusMetrics();
  }
}
