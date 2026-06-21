# Task Memory: task_06.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot
- Build the visible responsive booking experience on `customer/:id` using the existing `SingleUser` availability state: provider identity, trust signals, services, date/slot selection, summary, and disabled request action.

## Important Decisions
- Keep unavailable dates inert in `selectDate`; disabled date controls are not allowed to clear the selected slot.
- Use the existing `app-button` disabled input for the request action and native buttons for date/slot controls so `aria-pressed`, disabled, and labels remain explicit.
- Summary price is derived from the selected service `basePrice`, then `price`, then provider `priceFrom`, falling back to zero.

## Learnings
- `ng build --configuration development` is the cleanest current frontend validation signal for touched Angular templates/SCSS because Karma compiles unrelated stale specs even with `--include`.
- The booking page can compile with the new responsive layout, but the focused Karma command still fails before executing `single-user.spec.ts` due to unrelated repo harness issues already noted in shared memory.

## Files / Surfaces
- `apps/frontend/src/app/modules/common/single-user/single-user.ts`
- `apps/frontend/src/app/modules/common/single-user/single-user.html`
- `apps/frontend/src/app/modules/common/single-user/single-user.scss`
- `apps/frontend/src/app/modules/common/single-user/single-user.spec.ts`

## Errors / Corrections
- Corrected the rendered spec fixture to include a second available day; unavailable date selection attempts are now tested as no-ops instead of changing state.
- Removed `role="listitem"` from interactive date/slot buttons and kept accessible grouping on their containers.

## Ready for Next Run
- Frontend build passed after the UI changes.
- Focused Karma remains blocked by unrelated spec compile errors and unresolved root `@angular/compiler`, so coverage cannot be generated until the frontend test harness is fixed.
