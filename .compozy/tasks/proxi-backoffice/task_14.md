---
status: completed
title: Implement provider dashboard UI
type: frontend
complexity: medium
dependencies:
    - task_08
    - task_11
---

# Task 14: Implement provider dashboard UI

## Overview
Build the role-appropriate landing dashboard for Administrator and Support using the provider operational metrics API. It must communicate queue urgency and recent sensitive actions without expanding into out-of-scope marketplace analytics.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
1. MUST display pending providers, action totals, average review time, and recent sensitive actions.
2. MUST support the API's reporting-period selection and defined default.
3. MUST link operational cards to the corresponding filtered provider queue.
4. MUST provide accessible loading, empty, error, and non-color trend/status states.
5. MUST deny dashboard access to Finance and Moderator during the MVP.
</requirements>

## Subtasks
- [x] 14.1 Implement dashboard API client and models.
- [x] 14.2 Build metric cards and reporting-period control.
- [x] 14.3 Build recent sensitive-action summary.
- [x] 14.4 Connect metrics to provider queue filters.
- [ ] 14.5 Add role, empty-state, accessibility, and response-time tests.

## Implementation Details
Follow PRD "Provider-focused dashboard" and TechSpec "Dashboard and Audit".

### Relevant Files
- `apps/frontend/src/app/modules/providers/home/home.ts` — existing dashboard page pattern.
- `apps/frontend/src/app/shared/components/functional/provider-revenue-chart/provider-revenue-chart.ts` — chart accessibility precedent.
- `apps/frontend/src/app/shared/components/forms/filters/filters.ts` — period/filter interactions.

### Dependent Files
- `apps/backoffice/src/app/app.routes.ts` — role-protected landing route.
- `apps/backoffice/src/app/` — provider queue navigation target created by task_12.

### Related ADRs
- [ADR-001: Deliver the Backoffice Through Complete Operational Verticals](adrs/adr-001.md)

## Deliverables
- Provider dashboard and reporting-period interactions.
- Queue deep links and complete data states.
- Administrator and Support dashboard coverage.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for dashboard UI and API **(REQUIRED)**

## Tests
- Unit tests:
  - [x] Empty metrics render zeros and guidance without invalid averages.
  - [x] Period change requests and renders the selected window.
  - [x] Metric links preserve the intended provider filter.
- Integration tests:
  - [ ] Administrator and Support receive the dashboard; other roles receive denial state.
  - [ ] Seeded API metrics render exact counts and average duration.
  - [ ] Loading and error states remain keyboard and screen-reader accessible.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Displayed values reconcile exactly with the dashboard API.
- No out-of-scope financial or marketplace analytics appear.
