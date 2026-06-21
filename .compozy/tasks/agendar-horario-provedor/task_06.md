---
status: completed
title: Implement Responsive Booking UI
type: frontend
complexity: high
dependencies:
    - task_05
---

# Task 6: Implement Responsive Booking UI

## Overview
Build the visible booking screen on `customer/:id` using the state from `SingleUser`. The UI should let customers scan provider information, choose date and time, review the appointment summary, and request the appointment.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST render provider identity, trust signals, service details, date selection, time slot selection, and appointment summary.
- MUST keep the first viewport focused on the actual booking experience, not a landing page.
- MUST support desktop and mobile without overlapping text or controls.
- MUST show unavailable and loading states for dates and slots.
- MUST use existing shared UI components when they fit the current design system.
- MUST keep action buttons disabled while loading or when no slot is selected.
</requirements>

## Subtasks
- [x] 6.1 Update profile template layout for booking sections.
- [x] 6.2 Render calendar/date options from availability days.
- [x] 6.3 Render time slot buttons with selected and disabled states.
- [x] 6.4 Render appointment summary with service, date, time, price, and payment note.
- [x] 6.5 Add responsive SCSS for desktop and mobile.
- [x] 6.6 Add accessibility labels, pressed states, and live error messaging.

## Implementation Details
Use the provided mockup as visual direction while respecting existing Angular components and SCSS variables. Avoid nested cards and keep controls stable in size across states.

### Relevant Files
- `apps/frontend/src/app/modules/common/single-user/single-user.html` — booking markup.
- `apps/frontend/src/app/modules/common/single-user/single-user.scss` — responsive booking layout and controls.
- `apps/frontend/src/app/shared/components/ui/button/button.component.ts` — existing button component.
- `apps/frontend/src/app/shared/components/ui/badge/badge.ts` — trust/status badges.

### Dependent Files
- `apps/frontend/src/app/modules/common/single-user/single-user.spec.ts` — rendered UI assertions.
- `apps/frontend/src/styles.scss` — design tokens available to SCSS.

### Related ADRs
- [ADR-001: Provider Availability Slots as Backend Source of Truth](adrs/adr-001.md) — UI presents backend slots and unavailable states.

## Deliverables
- Responsive booking page UI on `customer/:id`.
- Calendar/date and time-slot controls.
- Appointment summary and request action.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for rendered booking UI **(REQUIRED)**

## Tests
- Unit tests:
  - [ ] Available dates render as selectable controls.
  - [ ] Unavailable dates render disabled or unavailable.
  - [ ] Selected slot has accessible selected state.
  - [ ] Submit button is disabled when no slot is selected.
  - [ ] Appointment summary updates when date or slot changes.
- Integration tests:
  - [ ] `SingleUser` fixture renders provider details, slots, and summary together.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- `customer/:id` presents the booking workflow shown in the provided reference.
- Layout remains usable on mobile and desktop.
