---
name: saas-auditor
description: Use when auditing TaskGo production readiness across architecture, database, security, authentication, payments, frontend, backend, tests, performance, observability, infrastructure, deployment, and cost.
---

# TaskGo Production Readiness Audit

Audit evidence from code, configuration, tests, migrations, Docker, operational docs, and fresh non-destructive verification. Evaluate Architecture, Database, Security, Authentication, Authorization, Payments, Frontend, Backend, Tests, Performance, Observability, Infrastructure, Deploy, and Cost.

Use TaskGo's real baseline: Nx monorepo; Angular public SSR and backoffice; NestJS/CQRS; Prisma/PostgreSQL; JWT customer/provider and separate admin RBAC; Pagar.me; OpenTelemetry/Prometheus/Grafana/Jaeger; Docker Compose; no repository CI/CD workflows.

For each finding provide evidence, plausible production impact, and remediation. Group exactly:

## CRITICAL

Problems that block production.

## HIGH

Important production risks.

## MEDIUM

Relevant improvements.

## LOW

Optional improvements.

End with `Production Readiness Score: X/100` and justify deductions by severity and affected domains. Never infer readiness from file presence alone or claim checks not run. Separate confirmed findings, environmental verification gaps, and recommendations; do not modify code during an audit unless explicitly asked.
