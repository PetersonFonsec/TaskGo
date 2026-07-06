# Task Memory: task_16.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot
- Configure task 16 infra release boundary: independent Backoffice deployment, restricted production CORS, admin observability, alert/dashboard config, and performance validation evidence.

## Important Decisions
- Master tracking still marks tasks 09-11 pending, but the repository already contains `apps/backoffice`, audit-log API/UI, auth shell, and provider dashboard surfaces. Continue against repository reality and leave tracking normalization to task completion evidence.
- Keep observability implementation local to backend bootstrap/module/interceptors and config files; do not change provider lifecycle semantics.

## Learnings
- Backend currently has wide-open `app.enableCors()` and OpenTelemetry tracing, but no explicit metrics endpoint or admin-specific telemetry layer.
- Existing `AdminAuditService` already rejects secret-like audit payload keys and complete personal-record shaped audit deltas; task 16 adds request/log sanitization around operational telemetry.
- Backend repo-wide coverage remains below the task threshold after this work: `npm run test:cov -- --runInBand` exits 0 but reports 70.69% statements because the existing Jest config collects many unrelated uncovered files. Backoffice coverage is above threshold at 93.53% statements.
- Root lint remains blocked by the existing backend ESLint config issue: `apps/backend/eslint.config.mjs` imports unresolved package `typescript-eslint`.
- The repeatable load profile is documented and test-validated, but a live load run requires a seeded API plus `ADMIN_TOKEN`; no live load execution was performed in this run.

## Files / Surfaces
- Planned surfaces: `apps/backend/src/main.ts`, `apps/backend/src/tracing.ts`, backend observability/config helpers, Docker/Prometheus/OTEL/Grafana config, Backoffice Docker/nginx runtime config, and perf docs/scripts.
- Implemented surfaces: `apps/backend/src/config/cors.config.ts`; `apps/backend/src/observability/*`; admin auth/roles/providers/audit telemetry hooks; `apps/backoffice/Dockerfile`; `apps/backoffice/config/*`; runtime Backoffice config injection; Docker Compose; Prometheus alerts; Grafana provisioning/dashboard; load profile docs/script/report.

## Errors / Corrections
- Fixed Prometheus scrape reachability by attaching the Backoffice service to `live_prometheus` in addition to the default compose network.
- Fixed histogram exposition from `metric{labels}_p95` to Prometheus-friendly `metric_p95{labels}`.

## Ready for Next Run
- Remaining acceptance gaps before marking task complete: resolve repo-wide coverage target or clarify task-scoped coverage, fix backend lint dependency/config, and execute `scripts/perf/backoffice-list-load.mjs` against a seeded local stack with an administrator JWT.
