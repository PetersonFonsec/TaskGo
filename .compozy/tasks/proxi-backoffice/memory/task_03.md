# Task Memory: task_03.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot
- Implement task 03 admin authorization boundary: dedicated admin request actor, deny-by-default fixed-role metadata, guard application, and negative authorization tests.

## Important Decisions
- Admin controllers will opt out of the marketplace global `AuthGuard` with existing `@Public()` metadata, then enforce `AdminAuthGuard` and `AdminRolesGuard` inside the admin boundary. This preserves marketplace behavior while preventing ordinary JWTs from authorizing `/admin/*`.
- Attach a typed `adminActor` request context and keep the existing `adminOperator` request key as a compatibility alias for task 02 and future handoffs that referenced it.

## Learnings
- Prior task 02 already added `AdminAuthGuard`, `AdminAuthService`, token issuing, `AdminModule`, Prisma admin models, and admin auth tests; task 03 should extend these surfaces rather than replace them.
- `AdminAuthService.validatePayload` must reject stored-role mismatches in addition to stale `tokenVersion`; role authorization then evaluates the persisted request actor role.
- Test-only E2E route-family probes can exercise `/admin/users`, `/admin/providers`, provider decisions, dashboard, audit, and missing-metadata behavior without shipping unfinished business controllers.

## Files / Surfaces
- Planned surfaces: `apps/backend/src/modules/admin/auth/*`, new admin authorization decorators/guard/types, admin module/controller boundary, and focused unit/E2E tests.
- Implemented surfaces: `apps/backend/src/modules/admin/auth/admin-actor.ts`, `admin-auth-token.service.ts`, `admin-auth.service.ts`, `admin-auth.guard.ts`, `admin-auth.controller.ts`, `admin-auth.module.ts`, `apps/backend/src/modules/admin/authorization/*`, and `apps/backend/test/e2e/admin-authorization.e2e-spec.ts`.

## Errors / Corrections
- First focused admin unit run failed because `admin-auth.guard.spec.ts` mocked only `switchToHttp()`; after adding `Reflector.getAllAndOverride()` the guard also needs `getHandler()` and `getClass()` on the mocked execution context.
- First admin authorization E2E run failed at Nest test-module compilation: the test-only root controller used `AdminAuthGuard`, but `AdminAuthModule` providers were not directly imported into the root test module.
- Second admin authorization E2E run had 11/12 passing; only the allowed Administrator POST probe returned Nest's default 201 instead of the expected 200, so the test-only probe needs explicit status normalization.
- `npm run lint` remains blocked by repository lint setup: checked-in `eslint.config.mjs` imports `typescript-eslint`, but the package is not declared/resolvable. A temporary dependency probe was reverted; no package manifest/lock changes should remain from it.

## Ready for Next Run
- Code/test implementation is in place, but task tracking is intentionally not marked complete because the full verification gate is not clean due to lint. Passing evidence from this run: backend build, all backend unit tests, admin coverage, and full backend E2E. Failing evidence: backend lint exits before source analysis with missing `typescript-eslint`.
