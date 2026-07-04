# Task Memory: task_10.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot
- Create a separate Nx-discovered Angular application at `apps/backoffice` with independent build, serve, unit test, and Cypress E2E targets.

## Important Decisions
- Mirrored the existing frontend's per-app Angular CLI ownership pattern: Nx targets delegate into `apps/backoffice` commands rather than adding Angular builders at the root.
- Kept the initial app shell minimal: dashboard route, not-found route, environment token, and no public marketplace customer/provider services or routes.
- Pinned the backoffice Cypress dev dependency to `15.5.0` after the floating `^15.5.0` range resolved to `15.18.0`; both versions failed local binary verification on this machine.

## Learnings
- `npx nx build backoffice` originally failed with `Cannot find project 'backoffice'`, confirming the pre-change missing-project baseline.
- Angular 21's `@angular/build:karma` compiles the test bundle before Karma starts; a custom `karma.conf.js` must not require the obsolete `@angular/build/plugins/karma` subpath.
- `npx nx build backoffice` succeeds and outputs to `apps/backoffice/dist/backoffice`.
- `npx nx test backoffice` succeeds with 4 specs and 100% statements/branches/functions/lines coverage.

## Files / Surfaces
- Added `apps/backoffice/project.json`, `angular.json`, package scripts/dependencies, strict tsconfigs, Karma config, source entry points, environment files, unit tests, Cypress config/spec/support, and a local Cypress runner script.
- Updated root `package.json` workspaces/scripts and `package-lock.json` for the new workspace package.

## Errors / Corrections
- First unit-test run failed because `@angular/build/plugins/karma` is not exported; removed that plugin reference from `karma.conf.js`.
- Second unit-test run failed coverage because the default environment token factory was uncovered; added a direct token-resolution spec.
- `npx nx e2e backoffice` starts the backoffice dev server on `127.0.0.1:4300`, but Cypress fails before executing specs: the cached macOS Cypress app rejects `--no-sandbox`, `--smoke-test`, and `--ping`. Reinstalling Cypress, clearing the cache, and pinning backoffice Cypress to `15.5.0` did not resolve it. The task is not complete until Cypress can run or the environment issue is resolved.

## Ready for Next Run
- Do not mark task 10 completed yet. Build and unit coverage are green, but Cypress E2E is blocked by local Cypress binary startup.
- Re-run `npx nx e2e backoffice` after fixing Cypress binary execution on macOS; expected specs are `apps/backoffice/cypress/e2e/backoffice-smoke.cy.ts`.
