# Task Memory: task_13.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot
- Implement the Backoffice operator administration UI for Administrator-only listing, invitation/resend, role changes, activation, deactivation, conflict handling, and tests.
- Pre-change baseline: `/operators` exists in `apps/backoffice/src/app/app.routes.ts` but points to `DashboardPage`; no operator admin feature files exist.

## Important Decisions
- Treat `_tasks.md` dependency rows for task 05 and task 11 as stale tracking: both individual task files are `status: completed`, and the corresponding backend/admin-user and backoffice shell source is present.
- Implement invitation resend by re-posting `POST /admin/users/invitations` for inactive unactivated operators, matching the backend's safe invitation rotation contract; there is no separate resend endpoint in the implemented API.

## Learnings
- Backoffice unit coverage gate is global and branch-sensitive; operator page tests need to cover conflict, validation, success, and error branches to keep branch coverage above 80%.
- Cypress specs in this workspace share global script scope unless a spec is made a module with `export {}`; new specs should avoid top-level helper collisions.

## Files / Surfaces
- Planned surfaces: `apps/backoffice/src/app/features/operators/*`, route guards/navigation tests, and Cypress e2e specs.
- Added operator admin models, service, page template, and styles under `apps/backoffice/src/app/features/operators/`.
- Updated `apps/backoffice/src/app/core/auth/admin-auth.guards.ts` and `apps/backoffice/src/app/app.routes.ts` so `/operators` is Administrator-only instead of a dashboard placeholder.
- Added/updated unit specs for fixed role options, operator API client, operator page workflows, role guard behavior, and non-Administrator routing.
- Added `apps/backoffice/cypress/e2e/operator-administration.cy.ts` for invite/activate, role session-invalidation copy, and deactivation confirmation coverage.

## Errors / Corrections
- Initial route integration test expected the child `DashboardPage`, but `RouterTestingHarness` resolved the routed shell for the redirect; corrected the assertion to navigate and inspect resulting URL/content.
- Initial unit coverage failed branch threshold at 73.89%; added focused operator page branch tests and reran with 81.85% branch coverage.
- Initial Cypress TypeScript check failed because the new spec shared global helper names with existing specs; added `export {}` and typed operator fixtures.
- `npx nx e2e backoffice` still fails before running specs because Cypress 15.5.0 cached app rejects smoke-test flags (`--no-sandbox`, `--smoke-test`, `--ping`) on darwin-arm64. This matches the existing shared workflow risk.

## Ready for Next Run
- Do not mark task 13 complete until Cypress can start and execute the added operator-administration spec, or the project accepts an alternate integration runner/evidence path.
- Fresh passing commands from this run: `npx nx test backoffice`, `npx tsc -p apps/backoffice/cypress/tsconfig.json --noEmit`, and `npx nx build backoffice --skip-nx-cache`.
