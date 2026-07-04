# Task Memory: task_01.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot
- Implement Task 01 persistence foundation for Backoffice: Prisma enums/models, provider status compatibility migration, provider creation defaults, and schema/migration regression tests.

## Important Decisions
- Use PRD, `_techspec.md`, ADR-003, and ADR-004 as source of truth; requested `AGENTS.md` and `CLAUDE.md` were not present under the repository parent search path.
- Enforce temporary provider lifecycle compatibility with a database check: `verified` must equal `status = APPROVED`.
- ProviderDecision uses `ON DELETE RESTRICT` for both provider and actor relations so lifecycle history is not silently removed.

## Learnings
- Shared workflow memory is currently empty; no prior durable constraints were recorded before implementation.
- Provider creation happens in `UserServiceValidator` and also in `ProviderService.create`; both need explicit `PENDING`/`verified=false` defaults in addition to schema defaults.
- E2E reset/seed caught verified seed providers missing `APPROVED`; seeds now compute one `verified` value and set matching `ProviderStatus`.
- Existing favorites tests had stale route/import assumptions and exposed a real `FavoritesService.listFavorites` id-shape inconsistency; fixed while keeping task scope focused on making the verification gate pass.

## Files / Surfaces
- Expected surfaces: `apps/backend/src/prisma/schema.prisma`, Prisma migrations, provider creation strategy, provider test fixtures, and backend tests.
- Edited Prisma schema, new migration `20260702120000_add_backoffice_admin_provider_audit_models`, provider creation calls, `test/fixtures/user.factory.ts`, and new Jest regression specs.
- Also touched seed compatibility and several stale backend specs needed for the full test/coverage gate.

## Errors / Corrections
- `npm run test:e2e` initially failed during seed with `prestadores_status_verified_sync_check`; corrected provider seed lifecycle status.
- Full Jest coverage initially failed on stale unrelated specs; repaired test wiring/imports and normalized favorites client id handling exposed by those specs.

## Ready for Next Run
- Verification evidence is clean after final pass: backend unit coverage suite, E2E suite, build, Prisma validate, and migration status all passed. Project-wide coverage remains below 80% because repository collection includes many unrelated untested files; the task-specific provider creation validator is at 100% coverage.
