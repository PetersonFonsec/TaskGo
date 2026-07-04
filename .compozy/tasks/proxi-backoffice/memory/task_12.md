# Task Memory: task_12.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot
- Build the Backoffice provider operational vertical in `apps/backoffice`: queue, details/history, Administrator decisions, Support read-only behavior, and tests.

## Important Decisions
- Scope frontend changes to `apps/backoffice` provider UI and task tracking; the workspace already contains large backend/admin diffs from prior tasks and those should be preserved.
- Kept provider command client methods explicit (`approve`, `reject`, `block`, `unblock`) to match ADR-004 and avoid generic status mutation.
- Did not mark task tracking complete because Cypress e2e cannot launch in this environment, despite unit coverage/build passing and Cypress spec type-check passing.

## Learnings
- `AGENTS.md` and `CLAUDE.md` are not present under the repo root or its immediate parent search; proceed with PRD/TechSpec/ADR guidance.
- Existing Backoffice routes point `/providers` at `DashboardPage`; task 12 starts from an auth/shell baseline without provider feature files.
- Backoffice Cypress support helpers were incomplete for existing specs; `cypress/support/testing-library.ts` now declares and implements `findByRole`, `findByLabelText`, and `findByText`.
- Verification evidence after implementation: `npm run test -- --watch=false --browsers=ChromeHeadless --code-coverage` passed 41 tests with 91.71% statements and 83.7% branches; `npm run build` passed; `npx tsc -p cypress/tsconfig.json --noEmit` passed.

## Files / Surfaces
- Expected primary surface: `apps/backoffice/src/app/features/providers`.
- Expected supporting surfaces: Backoffice routes, auth/session role checks, Cypress specs.
- Added provider models/client, queue page, details/history/decision page, shared provider styles, unit specs, and Cypress provider journey spec under `apps/backoffice`.
- Updated `apps/backoffice/src/app/app.routes.ts` so `/providers` renders the queue and `/providers/:id` renders review details.
- Updated `apps/backoffice/cypress/support/testing-library.ts` to support the Cypress queries used by existing and new specs.

## Errors / Corrections
- Initial unit run failed on a strict `ProviderStatus` filter typing mismatch; fixed by narrowing filter status before building query params.
- Unit coverage initially failed branch threshold at 79.25%; added focused tests for reasoned commands and queue error/clear branches, raising branch coverage to 82.96%.
- `npm run e2e` fails before executing specs because Cypress 15.5.0 binary startup fails with `bad option: --no-sandbox`, `--smoke-test`, and `--ping`. Forced Cypress reinstall did not resolve it; skip-verify Chrome invocation fails on a missing Cypress app `index.js`.

## Ready for Next Run
- Do not update task_12 status or master task tracking until Cypress e2e can run and pass.
- After fixing the Cypress binary/cache, rerun `npm run e2e` from `apps/backoffice` to validate the added provider journey specs.
