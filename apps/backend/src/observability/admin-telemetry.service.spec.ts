import { AdminTelemetryService } from './admin-telemetry.service';

describe('AdminTelemetryService', () => {
  it('emits correlated request metrics without secret labels', () => {
    const service = new AdminTelemetryService();

    service.observeRequest({
      requestId: 'req-1',
      method: 'GET',
      route: '/admin/providers',
      statusCode: 200,
      latencyMs: 123,
      adminId: '42',
      role: 'ADMINISTRATOR',
      outcome: 'success',
    });

    const metrics = service.renderPrometheusMetrics();
    expect(metrics).toContain('admin_http_requests_total');
    expect(metrics).toContain('route="/admin/providers"');
    expect(metrics).toContain('role="ADMINISTRATOR"');
    expect(metrics).toContain('admin_list_endpoint_duration_ms_p95');
    expect(metrics).not.toContain('password');
    expect(metrics).not.toContain('authorization');
    expect(metrics).not.toContain('token');
  });

  it('emits audit failure, login failure, 5xx, and latency alert source metrics', () => {
    const service = new AdminTelemetryService();

    service.recordAuditWriteFailure('ProviderApproved');
    service.recordLogin('failure', { reason: 'invalid_credentials' });
    service.observeRequest({
      method: 'GET',
      route: '/admin/audit-logs',
      statusCode: 503,
      latencyMs: 650,
      role: 'ADMINISTRATOR',
      outcome: 'error',
    });

    const metrics = service.renderPrometheusMetrics();
    expect(metrics).toContain('admin_audit_write_failures_total');
    expect(metrics).toContain('admin_login_attempts_total');
    expect(metrics).toContain('status="503"');
    expect(metrics).toContain(
      'admin_list_endpoint_duration_ms_p95{endpoint="/admin/audit-logs"} 650',
    );
  });
});
