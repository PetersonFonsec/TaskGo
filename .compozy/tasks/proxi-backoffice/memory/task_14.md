# Task Memory: task_14.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot

- Implement the Backoffice provider dashboard landing page for Administrator and Support using `/admin/dashboard/providers`; keep Finance and Moderator denied for MVP.

## Important Decisions

- Use an in-page denial state for Finance/Moderator on `/` instead of a root route guard, because redirecting unauthorized root access back to `/` would loop or obscure the denial requirement.
- Reuse `ProviderAdminService` for dashboard API access so provider dashboard, queue, details, and lifecycle calls stay in one provider operations client.

## Learnings

- Current Backoffice dashboard page is a placeholder showing operator/environment metadata only.
- Backend dashboard API is already present and returns `period`, `queue.pending`, decision totals, review duration, and recent sensitive actions.
- Provider queue filters use `status`, `submittedFrom`, and `submittedTo` query parameters; dashboard cards should deep-link to those existing filters.
- Backoffice unit tests and build pass after dashboard implementation: `npx nx test backoffice` reports 68 specs passing with statements 92.51%, branches 81.51%, functions 90.19%, lines 93.19%; `npx nx build backoffice` succeeds.

## Files / Surfaces

- Touched: `apps/backoffice/src/app/features/dashboard/*`.
- Touched: `apps/backoffice/src/app/features/providers/provider-admin.models.ts`.
- Touched: `apps/backoffice/src/app/features/providers/provider-admin.service.ts` and spec.
- Touched: `apps/backoffice/src/app/app.spec.ts`, `apps/backoffice/src/app/app.routes.spec.ts`.
- Added: `apps/backoffice/cypress/e2e/provider-dashboard.cy.ts`.

## Errors / Corrections

- Initial dashboard route specs expected the child component from `RouterTestingHarness`; corrected to assert through the routed shell and flush HTTP with explicit `detectChanges()`.
- `npx nx e2e backoffice` still fails before specs run because Cypress 15.5.0 cached binary rejects smoke-test flags (`--no-sandbox`, `--smoke-test`, `--ping=344`) on darwin-arm64.

## Ready for Next Run

- Task implementation is code-complete for dashboard UI and unit-covered, but do not mark task completed until Cypress or an equivalent integration gate can execute successfully.
