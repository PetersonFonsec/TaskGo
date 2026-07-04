---
status: pending
title: Configure deployment, observability, and performance validation
type: infra
complexity: high
dependencies:
  - task_08
  - task_09
  - task_10
  - task_11
---

# Task 16: Configure deployment, observability, and performance validation

## Overview
Make the Backoffice independently deployable and add operational evidence for authentication, authorization, provider commands, audit reliability, and query latency. This task closes the release boundary without introducing new product functionality.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
1. MUST build and deploy the Backoffice independently from the public frontend.
2. MUST restrict API CORS to configured public and Backoffice origins outside development.
3. MUST emit the metrics, traces, and sanitized structured fields listed in TechSpec "Monitoring and Observability".
4. MUST alert on audit-write failure, repeated admin login failure, elevated 5xx, and sustained p95 breach.
5. MUST document and execute a repeatable load profile proving provider and audit lists below 500 ms p95.
6. MUST never log passwords, JWTs, invitation tokens, or complete personal records.
</requirements>

## Subtasks
- [ ] 16.1 Add independent Backoffice deployment and runtime configuration.
- [ ] 16.2 Configure explicit environment-based CORS origins.
- [ ] 16.3 Add administrative metrics, trace attributes, and sanitized logs.
- [ ] 16.4 Configure dashboards and alert thresholds.
- [ ] 16.5 Define and run the representative load profile.
- [ ] 16.6 Add configuration, privacy, health, and performance regression checks.

## Implementation Details
Follow TechSpec "Monitoring and Observability" and ADR-005. Reuse the current OpenTelemetry, Prometheus, Grafana, and Docker Compose stack before adding tooling.

### Relevant Files
- `apps/backend/src/main.ts` — CORS, middleware, and application bootstrap.
- `apps/backend/src/tracing.ts` — OpenTelemetry setup.
- `docker-compose.yml` — local operational services and deployments.

### Dependent Files
- `config/prometheus.yaml` — scrape targets.
- `config/otel-collector-config.yml` — telemetry pipeline.
- `config/example.env` — documented runtime variables.

### Related ADRs
- [ADR-002: Separate Backoffice Frontend With Shared API](adrs/adr-002.md)
- [ADR-005: Comprehensive Backoffice Verification Gate](adrs/adr-005.md)

## Deliverables
- Independent Backoffice deployment configuration.
- Restricted production CORS and documented environment variables.
- Administrative metrics, traces, logs, dashboards, and alerts.
- Repeatable p95 load report for provider and audit queries.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for deployment and telemetry configuration **(REQUIRED)**

## Tests
- Unit tests:
  - [ ] Log sanitizer removes passwords, JWTs, invitations, and full personal objects.
  - [ ] CORS parser accepts configured origins and rejects unlisted origins.
- Integration tests:
  - [ ] Backoffice artifact starts independently and reaches the configured API health endpoint.
  - [ ] Administrative request emits correlated trace and metric labels without secrets.
  - [ ] Audit-write failure and sustained latency breach trigger configured alerts.
  - [ ] Documented load profile reports both list endpoints below 500 ms p95.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Backoffice deploys without the public frontend artifact.
- Required alerts and telemetry are observable in the local operational stack.
- Both paginated list endpoints satisfy the accepted p95 target.
