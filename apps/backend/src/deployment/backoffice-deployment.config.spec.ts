import * as fs from 'node:fs';
import * as path from 'node:path';

const repoRoot = path.resolve(process.cwd(), '../..');

function readRepoFile(relativePath: string) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

describe('Backoffice deployment and observability configuration', () => {
  it('defines an independent Backoffice container without the public frontend', () => {
    const compose = readRepoFile('docker-compose.yml');
    const dockerfile = readRepoFile('apps/backoffice/Dockerfile');
    const nginx = readRepoFile('apps/backoffice/config/nginx.conf');

    expect(compose).toContain('backoffice:');
    expect(compose).toContain('dockerfile: apps/backoffice/Dockerfile');
    expect(compose).toContain('"4300:80"');
    expect(compose).not.toContain('context: ./apps/frontend');
    expect(dockerfile).toContain('FROM nginx:1.27-alpine');
    expect(dockerfile).toContain('npm run build');
    expect(nginx).toContain('location = /health');
    expect(nginx).toContain('backoffice_health 1');
  });

  it('documents runtime CORS and Backoffice environment variables', () => {
    const exampleEnv = readRepoFile('config/example.env');
    const backendEnv = readRepoFile('config/backend.env');

    expect(exampleEnv).toContain('PUBLIC_FRONTEND_ORIGINS=');
    expect(exampleEnv).toContain('BACKOFFICE_FRONTEND_ORIGINS=');
    expect(exampleEnv).toContain('BACKOFFICE_API_URL=');
    expect(backendEnv).toContain(
      'BACKOFFICE_FRONTEND_ORIGINS=http://localhost:4300',
    );
  });

  it('configures Prometheus alert thresholds and Grafana dashboards', () => {
    const prometheus = readRepoFile('config/prometheus.yaml');
    const alerts = readRepoFile('config/prometheus/alerts.yml');
    const dashboard = readRepoFile(
      'config/grafana/dashboards/backoffice-observability.json',
    );

    expect(prometheus).toContain('/etc/prometheus/alerts.yml');
    expect(prometheus).toContain('metrics_path: /metrics');
    expect(alerts).toContain('BackofficeAuditWriteFailure');
    expect(alerts).toContain('BackofficeRepeatedAdminLoginFailure');
    expect(alerts).toContain('BackofficeElevated5xx');
    expect(alerts).toContain('BackofficeSustainedP95LatencyBreach');
    expect(alerts).toContain('admin_list_endpoint_duration_ms_p95 > 500');
    expect(dashboard).toContain('Provider and Audit List p95');
  });

  it('documents a repeatable load profile below the 500 ms p95 target', () => {
    const profile = readRepoFile('docs/operations/backoffice-load-profile.md');
    const report = JSON.parse(
      readRepoFile('docs/operations/backoffice-load-report.json'),
    ) as {
      accepted: boolean;
      results: Record<string, { p95Ms: number }>;
    };

    expect(profile).toContain('LOAD_DURATION_SECONDS');
    expect(profile).toContain('/admin/providers?page=1&limit=50');
    expect(profile).toContain('/admin/audit-logs?page=1&limit=50');
    expect(report.accepted).toBe(true);
    expect(
      Object.values(report.results).every((result) => result.p95Ms < 500),
    ).toBe(true);
  });
});
