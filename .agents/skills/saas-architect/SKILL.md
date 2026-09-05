---
name: saas-architect
description: Use when designing or assessing TaskGo features, module boundaries, dependencies, integrations, scalability, or cross-application impact before implementation.
---

# TaskGo SaaS Architecture

Work from the actual Nx monorepo: `apps/backend` is NestJS, `apps/frontend` is the customer/provider Angular SSR app, `apps/backoffice` is the Angular admin app, `apps/landing-page` is Vite/static, and `libs/shared` holds neutral contracts/value objects.

1. Trace the affected journey across UI, HTTP contract, authorization, use case, Prisma schema, external services, tests, and deployment.
2. Preserve bounded backend modules and each Angular app's organization.
3. Prefer existing incremental CQRS for meaningful reads/writes; do not force CQRS or new layers into simple legacy modules without benefit.
4. Keep controllers thin, resource authorization in use cases, persistence through `PrismaService`, and only genuinely neutral contracts in `libs/shared`.
5. Identify compatibility, migration, transaction, observability, security, and rollback impact. Offer the smallest coherent design and label recommendations that are not established conventions.

Avoid speculative services, queues, repositories, or abstractions. Keep public and backoffice contracts/authentication separated.
