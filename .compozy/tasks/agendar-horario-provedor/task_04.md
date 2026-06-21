---
status: completed
title: Add Frontend Availability Service Contract
type: frontend
complexity: low
dependencies:
    - task_01
    - task_02
---

# Task 4: Add Frontend Availability Service Contract

## Overview
Add the Angular service method and typed models needed to load provider availability. This task gives the booking page a small, testable API boundary before UI state is added.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST add a typed `getAvailability` method to the frontend `Provider` service.
- MUST send `from`, `to`, and optional `serviceId` as query params.
- MUST add TypeScript interfaces for the availability response.
- MUST keep existing favorite and order methods unchanged.
- MUST include HttpClient tests for the generated URL and params.
</requirements>

## Subtasks
- [ ] 4.1 Add availability interfaces in the provider model file.
- [ ] 4.2 Add `getAvailability` to the frontend provider service.
- [ ] 4.3 Add request param tests for date range and service id.
- [ ] 4.4 Confirm existing provider service tests still pass.

## Implementation Details
Follow the TechSpec "Integration Points" section. Keep the method in the existing provider service because `SingleUser` already injects it.

### Relevant Files
- `apps/frontend/src/app/shared/service/provider/provider.ts` — add availability HTTP method.
- `apps/frontend/src/app/shared/service/provider/provider.model.ts` — add availability response interfaces.
- `apps/frontend/src/app/shared/service/provider/provider.spec.ts` — service request tests.

### Dependent Files
- `apps/frontend/src/app/modules/common/single-user/single-user.ts` — consumes the new method in task 05.

### Related ADRs
- [ADR-001: Provider Availability Slots as Backend Source of Truth](adrs/adr-001.md) — frontend consumes backend slots without local rule ownership.

## Deliverables
- Typed availability models.
- Frontend provider service availability method.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for availability service HTTP call **(REQUIRED)**

## Tests
- Unit tests:
  - [ ] `getAvailability` calls `/provider/:id/availability`.
  - [ ] `getAvailability` includes `from` and `to` query params.
  - [ ] `getAvailability` includes `serviceId` only when provided.
- Integration tests:
  - [ ] Service response type supports days and slots consumed by `SingleUser`.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Booking page has a typed availability API client.
- Existing provider service behavior is unchanged.
