---
status: completed
title: Implement provider queue, details, and decisions UI
type: frontend
complexity: high
dependencies:
    - task_06
    - task_07
    - task_11
---

# Task 12: Implement provider queue, details, and decisions UI

## Overview
Build the Backoffice's complete provider operational vertical: filtered queue, review details, lifecycle history, and explicit decision dialogs. The experience must prevent accidental destructive actions and keep Support read-only.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
1. MUST render paginated provider status and submission-date filters with URL-preserved state.
2. MUST display all authorized review context and chronological lifecycle history.
3. MUST expose approve, reject, block, and unblock only to Administrator in valid states.
4. MUST require and validate reasons for reject, block, and unblock before submission.
5. MUST confirm consequences, announce outcomes, and recover visibly from 409 conflicts.
6. MUST use non-color status indicators and full keyboard operation.
</requirements>

## Subtasks
- [ ] 12.1 Implement provider API client and typed models.
- [ ] 12.2 Build the paginated and filterable provider queue.
- [ ] 12.3 Build provider details and lifecycle history.
- [ ] 12.4 Build accessible confirmation and reason dialogs.
- [ ] 12.5 Enforce role and state-driven action visibility.
- [ ] 12.6 Add component and Cypress coverage for the complete journey.

## Implementation Details
Follow TechSpec "Providers" and PRD "User Experience". Keep command-specific methods rather than a generic status mutation.

### Relevant Files
- `apps/frontend/src/app/modules/customer/search/search.ts` — filtered listing pattern.
- `apps/frontend/src/app/modules/orders/order-timeline/order-timeline.ts` — lifecycle timeline precedent.
- `apps/frontend/src/app/shared/components/ui/full-modal/full-modal.ts` — modal behavior.

### Dependent Files
- `apps/frontend/src/app/shared/components/forms/filters/filters.ts` — reusable filtering concepts.
- `apps/frontend/src/app/shared/components/functional/notification/notification.service.ts` — outcome announcements.

### Related ADRs
- [ADR-001: Deliver the Backoffice Through Complete Operational Verticals](adrs/adr-001.md)
- [ADR-004: Explicit Provider Commands With Transactional Audit](adrs/adr-004.md)

## Deliverables
- Provider queue, detail, history, and explicit decision screens.
- Accessible confirmation, validation, conflict, loading, and success states.
- Administrator and Support behavior coverage.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for the provider operational journey **(REQUIRED)**

## Tests
- Unit tests:
  - [ ] Filters update URL and reset paging deterministically.
  - [ ] Actions appear only for Administrator and valid provider states.
  - [ ] Blank reason prevents reject, block, and unblock submission.
- Integration tests:
  - [ ] Administrator approves a pending provider and sees the new history entry.
  - [ ] Support can inspect the same provider but cannot invoke a command.
  - [ ] A 409 refreshes stale state and presents a clear conflict message.
  - [ ] Keyboard and screen-reader status assertions pass for every dialog.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Administrator completes every provider lifecycle transition from the UI.
- Support has read-only access with no hidden command still invokable.

