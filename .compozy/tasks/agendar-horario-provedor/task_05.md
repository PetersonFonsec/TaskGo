---
status: completed
title: Build Customer Booking State in Provider Profile
type: frontend
complexity: high
dependencies:
    - task_03
    - task_04
---

# Task 5: Build Customer Booking State in Provider Profile

## Overview
Add the state and behavior that powers booking on the existing provider profile page. This task loads availability, tracks selected date and slot, builds the scheduled order payload, and handles unavailable-slot errors.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST load provider details and availability for the visible booking range.
- MUST select a default date only when available slots exist.
- MUST require a selected slot before submitting the appointment request.
- MUST send `scheduledFor` in the existing `hireProvider` payload.
- MUST preserve favorite toggle behavior on the provider profile.
- MUST surface backend unavailable-slot errors without losing the selected provider context.
</requirements>

## Subtasks
- [ ] 5.1 Add signals or computed state for availability days, selected date, selected slot, and summary.
- [ ] 5.2 Load availability after the provider response resolves.
- [ ] 5.3 Add handlers for changing date and slot selection.
- [ ] 5.4 Update `register` to require and submit `scheduledFor`.
- [ ] 5.5 Add loading, empty, and error states for availability.
- [ ] 5.6 Preserve existing favorite behavior and modal flow.

## Implementation Details
Follow the TechSpec "Component Overview" and "Development Sequencing" sections. Keep state inside `SingleUser` for MVP; extract smaller components only if the page becomes difficult to test.

### Relevant Files
- `apps/frontend/src/app/modules/common/single-user/single-user.ts` — booking state and submit behavior.
- `apps/frontend/src/app/modules/common/single-user/single-user.spec.ts` — component behavior coverage.
- `apps/frontend/src/app/shared/service/provider/provider.model.ts` — availability types.

### Dependent Files
- `apps/frontend/src/app/modules/common/single-user/single-user.html` — renders the state in task 06.
- `apps/frontend/src/app/modules/common/single-user/single-user.scss` — styles the state in task 06.
- `apps/frontend/src/app/shared/service/user-logged/user-logged.service.ts` — source for client id and address snapshot.

### Related ADRs
- [ADR-001: Provider Availability Slots as Backend Source of Truth](adrs/adr-001.md) — page must render returned slots rather than deriving them locally.

## Deliverables
- Booking state in `SingleUser`.
- Scheduled order payload with `scheduledFor`.
- Error and empty-state behavior.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for profile booking state **(REQUIRED)**

## Tests
- Unit tests:
  - [ ] Provider load triggers availability load for the default date range.
  - [ ] Selecting a slot updates the appointment summary.
  - [ ] Submit without a slot does not call `hireProvider`.
  - [ ] Submit with a slot sends `scheduledFor`.
  - [ ] Favorite toggle still calls add/remove favorite.
- Integration tests:
  - [ ] Backend unavailable-slot error appears on the booking page.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- The profile page can submit a scheduled appointment request.
- Existing profile favorite behavior remains intact.
