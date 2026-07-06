import { Injectable, Logger } from '@nestjs/common';
import { trace } from '@opentelemetry/api';

import { sanitizeForStructuredLog } from './log-sanitizer';

type MetricLabels = Record<string, string | number | boolean | undefined>;

type RequestObservation = {
  requestId?: string;
  method: string;
  route: string;
  statusCode: number;
  latencyMs: number;
  adminId?: string;
  role?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  outcome: string;
};

const LIST_LATENCY_ENDPOINTS = new Set([
  'GET /admin/providers',
  'GET /admin/audit-logs',
]);

@Injectable()
export class AdminTelemetryService {
  private readonly logger = new Logger(AdminTelemetryService.name);
  private readonly counters = new Map<string, number>();
  private readonly histograms = new Map<string, number[]>();

  observeRequest(observation: RequestObservation) {
    const metricRoute = this.normalizeMetricRoute(observation.route);
    this.increment('admin_http_requests_total', {
      method: observation.method,
      route: metricRoute,
      status: String(observation.statusCode),
      outcome: observation.outcome,
      role: observation.role ?? 'anonymous',
    });
    this.observe('admin_http_request_duration_ms', observation.latencyMs, {
      method: observation.method,
      route: metricRoute,
    });

    if (LIST_LATENCY_ENDPOINTS.has(`${observation.method} ${metricRoute}`)) {
      this.observe('admin_list_endpoint_duration_ms', observation.latencyMs, {
        endpoint: metricRoute,
      });
    }

    this.setActiveSpanAttributes({
      'admin.request_id': observation.requestId,
      'admin.id': observation.adminId,
      'admin.role': observation.role,
      'admin.action': observation.action,
      'admin.entity_type': observation.entityType,
      'admin.entity_id': observation.entityId,
      'admin.outcome': observation.outcome,
      'http.route': metricRoute,
    });

    this.log('admin_request', observation);
  }

  recordLogin(result: 'success' | 'failure', metadata: MetricLabels = {}) {
    this.increment('admin_login_attempts_total', {
      result,
      reason: metadata.reason,
    });
    this.log('admin_login', { result, ...metadata });
  }

  recordOrdinaryTokenRejected(route: string) {
    this.increment('admin_ordinary_token_rejections_total', {
      route: this.normalizeMetricRoute(route),
    });
  }

  recordAuthorizationDenied(role: string | undefined, route: string) {
    this.increment('admin_authorization_denials_total', {
      role: role ?? 'unknown',
      route: this.normalizeMetricRoute(route),
    });
  }

  recordProviderDecision(action: string, result: string) {
    this.increment('admin_provider_decisions_total', { action, result });
  }

  recordTransactionRollback(reason: string) {
    this.increment('admin_transaction_rollbacks_total', { reason });
  }

  recordAuditWriteFailure(action: string) {
    this.increment('admin_audit_write_failures_total', { action });
  }

  observeDatabaseQuery(endpoint: string, durationMs: number) {
    this.observe('admin_database_query_duration_ms', durationMs, {
      endpoint: this.normalizeMetricRoute(endpoint),
    });
  }

  renderPrometheusMetrics() {
    const counterLines = Array.from(this.counters.entries()).map(
      ([key, value]) => `${key} ${value}`,
    );
    const histogramLines = Array.from(this.histograms.entries()).flatMap(
      ([key, values]) => {
        const { name, labels } = splitMetricKey(key);
        return [
          `${name}_count${labels} ${values.length}`,
          `${name}_sum${labels} ${values.reduce((sum, value) => sum + value, 0)}`,
          `${name}_p50${labels} ${percentile(values, 0.5)}`,
          `${name}_p95${labels} ${percentile(values, 0.95)}`,
          `${name}_p99${labels} ${percentile(values, 0.99)}`,
        ];
      },
    );

    return [...counterLines, ...histogramLines, ''].join('\n');
  }

  private increment(name: string, labels: MetricLabels = {}) {
    const key = this.metricKey(name, labels);
    this.counters.set(key, (this.counters.get(key) ?? 0) + 1);
  }

  private observe(name: string, value: number, labels: MetricLabels = {}) {
    const key = this.metricKey(name, labels);
    const values = this.histograms.get(key) ?? [];
    values.push(value);
    this.histograms.set(key, values.slice(-1000));
  }

  private metricKey(name: string, labels: MetricLabels) {
    const entries = Object.entries(labels)
      .filter(([, value]) => value !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));

    if (entries.length === 0) return name;

    const labelString = entries
      .map(([key, value]) => `${key}="${String(value).replace(/"/g, '\\"')}"`)
      .join(',');
    return `${name}{${labelString}}`;
  }

  private setActiveSpanAttributes(attributes: MetricLabels) {
    const span = trace.getActiveSpan();
    if (!span) return;

    Object.entries(attributes).forEach(([key, value]) => {
      if (value !== undefined) span.setAttribute(key, value);
    });
  }

  private normalizeMetricRoute(route: string) {
    return route
      .replace(/\/admin\/providers\/\d+/g, '/admin/providers/:id')
      .replace(/\/admin\/audit-logs\/\d+/g, '/admin/audit-logs/:id')
      .replace(/\/admin\/users\/\d+/g, '/admin/users/:id');
  }

  private log(event: string, fields: Record<string, unknown>) {
    const sanitized = sanitizeForStructuredLog(fields) as Record<
      string,
      unknown
    >;
    this.logger.log(JSON.stringify({ event, ...sanitized }));
  }
}

function splitMetricKey(key: string) {
  const labelStart = key.indexOf('{');
  if (labelStart === -1) return { name: key, labels: '' };

  return {
    name: key.slice(0, labelStart),
    labels: key.slice(labelStart),
  };
}

function percentile(values: number[], percentileValue: number) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.ceil(sorted.length * percentileValue) - 1;
  return sorted[Math.max(index, 0)];
}
