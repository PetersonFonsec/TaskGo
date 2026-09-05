---
name: devops-deploy
description: Use when changing or assessing TaskGo Docker, environments, builds, health checks, observability, deployment, rollback, CI/CD, or infrastructure cost and reliability.
---

# TaskGo DevOps and Deployment

The monorepo uses Nx/npm workspaces. Docker Compose currently runs PostgreSQL 17, Prometheus, Grafana, Jaeger, and an OpenTelemetry Collector; backend/backoffice services are present but commented. Angular Dockerfiles build to Nginx. Backoffice injects runtime config through its entrypoint. Backend/frontend telemetry uses OpenTelemetry and exposes/provisions metrics and dashboards. No CI/CD workflow is present under `.github`.

- Use actual root/package/Nx commands and preserve build contexts/output paths.
- Keep secrets in environment/config injection, never images, source, logs, or frontend bundles. Validate required backend environment through existing config validation.
- Separate development, test, and production data; make migration deploy an explicit reviewed release step with backup/rollback planning.
- Require meaningful health/readiness checks, dependency ordering, bounded restarts, structured correlated/sanitized logs, metrics/traces, and actionable alerts.
- For deploy changes, document rollout, schema compatibility, smoke tests, rollback, ownership, and approximate infrastructure cost.
- Treat `latest` image tags, commented app services, and absent CI/CD as current-state risks, not established recommendations.

Do not deploy, mutate production, or rotate secrets without explicit authorization.
