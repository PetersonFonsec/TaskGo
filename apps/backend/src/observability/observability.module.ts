import { Global, Module } from '@nestjs/common';

import { AdminTelemetryService } from './admin-telemetry.service';
import { MetricsController } from './metrics.controller';

@Global()
@Module({
  controllers: [MetricsController],
  providers: [AdminTelemetryService],
  exports: [AdminTelemetryService],
})
export class ObservabilityModule {}
