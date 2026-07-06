import {
  diag,
  DiagConsoleLogger,
  DiagLogLevel,
  trace,
} from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { PrismaInstrumentation } from '@prisma/instrumentation';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { NestInstrumentation } from '@opentelemetry/instrumentation-nestjs-core';

diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.ERROR);

const otelSDK = new NodeSDK({
  serviceName: 'taskgo-backend-nest',
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://localhost:4317',
    compression: 'gzip',
  } as any),
  instrumentations: [
    new HttpInstrumentation(),
    new ExpressInstrumentation(),
    new PrismaInstrumentation(),
    new NestInstrumentation(),
  ],
});

process.on('beforeExit', async () => {
  otelSDK
    .shutdown()
    .then(
      () => console.log('SDK shut down successfully'),
      (err) => console.log('Error shutting down SDK', err),
    )
    .finally(() => process.exit(0));
});

export default otelSDK;

export function getActiveTraceId() {
  const spanContext = trace.getActiveSpan()?.spanContext();
  return spanContext?.traceId;
}
