# Backoffice Load Profile

This profile validates the Task 16 release gate for paginated provider and audit list latency.

## Dataset

- 10,000 provider records spread across `PENDING`, `APPROVED`, `REJECTED`, and `BLOCKED`.
- 50,000 audit log records with indexed operator, action, entity, request ID, and date fields.
- Page size: 50 records.

## Traffic

- Warm-up: 10 seconds.
- Measurement duration: 60 seconds.
- Concurrency: 8 workers.
- Endpoints:
  - `GET /admin/providers?page=1&limit=50`
  - `GET /admin/audit-logs?page=1&limit=50`

## Command

```sh
ADMIN_TOKEN=<administrator-jwt> \
BACKOFFICE_API_BASE_URL=http://localhost:3000 \
LOAD_DURATION_SECONDS=60 \
LOAD_WARMUP_SECONDS=10 \
LOAD_CONCURRENCY=8 \
node scripts/perf/backoffice-list-load.mjs
```

## Acceptance

Both endpoints must report `p95Ms < 500`. The latest accepted evidence is stored in
`docs/operations/backoffice-load-report.json`.
