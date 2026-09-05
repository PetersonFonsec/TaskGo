---
name: testing
description: Use when designing, adding, running, or reviewing TaskGo unit, integration, HTTP E2E, Angular component, or Cypress regression tests.
---

# TaskGo Testing

Backend unit tests use Jest/SWC beside source; HTTP/integration E2E tests use Jest/Supertest under `apps/backend/test` and a PostgreSQL test database. Angular apps use Jasmine/Karma colocated specs; Cypress covers public and backoffice journeys. Storybook exists for public UI components.

- Match risk to layer: handler/service tests for business rules; E2E for routing, validation, guards, transactions, and persistence; component/service tests for Angular state/HTTP; Cypress for critical journeys.
- Test behavior and invariants, not private implementation or generated wording. Reuse existing factories/fixtures and deterministic provider mocks.
- Cover success, validation, unauthenticated/wrong-role/wrong-owner, missing data, conflicts, duplicates/races, provider failure, transaction rollback, loading/error/empty UI, and regressions as relevant.
- Keep external APIs mocked outside explicit integration tests; never use real credentials or charge a real payment.

From root use narrow Nx targets where possible. Backend E2E/reset commands are destructive to their configured database: run only after confirming `DATABASE_URL` is the dedicated `taskgo_test`. Report commands and fresh results; do not claim unrun checks.
