# Task Memory: task_02.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot
- Implement dedicated administrative JWT login and current-operator lookup for Task 02.
- Preserve marketplace `/auth/login` token and response contracts while adding `/admin/auth/login` and `/admin/auth/me`.

## Important Decisions
- Add a separate admin auth module/service/guard rather than changing the existing public auth token service.
- Use the existing JWT secret through `JwtModule` and distinguish admin tokens with `tokenKind: "admin"` plus `sub`, `role`, and `ver`.

## Learnings
- Baseline search found no existing `AdminAuth`, `/admin/auth`, or `tokenKind` implementation.
- Existing global `AuthGuard` validates any JWT and attaches decoded payload; admin `/me` needs an additional route guard that loads `AdminUser`, checks `active`, and compares `tokenVersion`.
- `JwtService.sign` should not receive both a payload `sub` and an options `subject`; admin token signing keeps `sub` in the payload and only passes `expiresIn`.
- Targeted ESLint is blocked by the repo config importing unresolved `typescript-eslint`; build, formatting, unit, coverage, and E2E checks were used as executable verification.

## Files / Surfaces
- Added `apps/backend/src/modules/admin/admin.module.ts`.
- Added `apps/backend/src/modules/admin/auth/*`.
- Updated `apps/backend/src/app.module.ts` to register `AdminModule`.
- Updated `apps/backend/test/e2e/auth.e2e-spec.ts` for admin login, admin me, marketplace token shape, and marketplace-token rejection on admin `/me`.

## Errors / Corrections
- Initial unit test mocked `bcrypt.compare` in a way that did not exercise the service import; corrected by using real bcrypt hashes in service tests.
- Initial coverage command used a path outside Jest `rootDir`; corrected to `--collectCoverageFrom='modules/admin/auth/**/*.ts'`.

## Ready for Next Run
- Task 02 implementation and verification are complete; automatic commit was disabled.
- Admin auth coverage evidence: `95.45%` statements overall for `modules/admin/auth/**/*.ts`.
