---
status: completed
title: Validate Scheduled Order Creation
type: backend
complexity: medium
dependencies:
    - task_02
---

# Task 3: Validate Scheduled Order Creation

## Overview
Protect the final appointment request by validating `scheduledFor` during order creation. This task prevents clients from creating orders for slots that are no longer available.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST validate scheduled order creation against backend availability before persistence.
- MUST reject unavailable or occupied scheduled slots with `400 Bad Request`.
- MUST preserve existing unscheduled order behavior when `scheduledFor` is omitted.
- MUST keep payment and address snapshot creation behavior unchanged.
- MUST avoid accepting malformed ISO datetimes beyond existing DTO validation.
</requirements>

## Subtasks
- [x] 3.1 Add scheduled slot availability check to order creation.
- [x] 3.2 Reuse provider/service ownership from the selected service.
- [x] 3.3 Return a clear error when the selected slot is unavailable.
- [x] 3.4 Preserve existing create order transaction behavior.
- [x] 3.5 Add regression tests for scheduled and unscheduled orders.

## Implementation Details
Use the TechSpec "API Endpoints" and "Known Risks" sections. The validation should happen immediately before the transaction creates the order.

### Relevant Files
- `apps/backend/src/modules/order/order.service.ts` — order creation flow.
- `apps/backend/src/modules/order/dto/create-order.dto.ts` — `scheduledFor` validation already exists.
- `apps/backend/src/modules/provider/provider.service.ts` — availability logic created in task 02.

### Dependent Files
- `apps/backend/src/modules/order/order.service.spec.ts` — scheduled order validation coverage.
- `apps/frontend/src/app/modules/common/single-user/single-user.ts` — depends on clear errors for unavailable slots.

### Related ADRs
- [ADR-001: Provider Availability Slots as Backend Source of Truth](adrs/adr-001.md) — requires server-side conflict prevention.

## Deliverables
- Scheduled order availability validation.
- Clear unavailable-slot error response.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for order creation with `scheduledFor` **(REQUIRED)**

## Tests
- Unit tests:
  - [x] `POST /order` with available `scheduledFor` creates the order.
  - [x] `POST /order` with occupied `scheduledFor` returns `400 Bad Request`.
  - [x] `POST /order` without `scheduledFor` keeps existing behavior.
- Integration tests:
  - [x] Creating two orders for the same provider service and slot rejects the second request.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Scheduled orders cannot bypass backend availability rules.
- Existing order creation behavior remains compatible.
