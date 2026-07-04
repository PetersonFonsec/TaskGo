# Task Memory: task_11.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot
- Implement Backoffice-only administrative login, session lifecycle, guarded routes, token interception, and role-based shell navigation for `apps/backoffice`.
- Acceptance is driven by `/admin/auth/login`, `/admin/auth/me`, Backoffice-specific storage, configured API-only token attachment, session clearing on API rejection, accessible login/shell states, and tests/coverage.

## Important Decisions
- Keep frontend Backoffice session code dedicated to `apps/backoffice`; adapt public frontend patterns only conceptually and do not import public marketplace auth/token services.
- Treat current `_tasks.md` dependency statuses for task_03/task_10 as potentially stale because `apps/backoffice` and admin backend surfaces exist in the workspace; keep this task scoped to the frontend app unless a narrow config change is required.

## Learnings
- `apps/backoffice` already has Angular/Karma/Cypress scaffolding, environment token wiring, and an initial dashboard/not-found scaffold.
- No root `AGENTS.md` or `CLAUDE.md` file was present in the workspace during startup checks.
- Backend admin auth currently returns `{ access_token, operator }` from `POST /admin/auth/login` and `{ operator }` from `GET /admin/auth/me`.
- Backoffice unit/coverage verification passes after this task's changes: `npm run backoffice:test` ran 32 specs with statements 94.18%, branches 86.95%, functions 94.87%, lines 94.33%.

## Files / Surfaces
- Planned primary surface: `apps/backoffice/src/app` auth/session/interceptor/guards/shell/navigation/tests, plus Backoffice Cypress journey.
- Implemented Backoffice auth/session storage, admin auth service, route guards, API-token interceptor, fixed-role navigation matrix, login page, protected admin shell, updated dashboard/not-found routing, unit/integration-style specs, and Cypress authentication journey spec under `apps/backoffice`.

## Errors / Corrections
- Initial routing specs assumed the child page was the routed component; corrected expectations because the protected shell is the activated route component.
- Cypress e2e is blocked before spec execution in this environment. `npm run backoffice:e2e` starts the dev server but Cypress 15.5.0 fails its binary smoke test because `/Users/petersonfonsecasimiao/Library/Caches/Cypress/15.5.0/Cypress.app/Contents/MacOS/Cypress` rejects `--no-sandbox`, `--smoke-test`, and `--ping`. Forced reinstalling the binary did not resolve it; running with `CYPRESS_SKIP_VERIFY=true` then fails loading missing `Contents/Resources/app/index.js` from the Cypress app bundle.

## Ready for Next Run
- Do not mark task_11 completed until Cypress e2e can run or the project replaces/fixes the local Cypress binary/runtime. Build and unit coverage are passing; required e2e remains unverified due to the Cypress binary/runtime blocker.
