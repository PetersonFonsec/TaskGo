---
status: pending
title: Implement Backend Availability Slots
type: backend
complexity: high
dependencies:
  - task_01
---

# Task 2: Implement Backend Availability Slots

## Overview
Implement the backend availability endpoint and service logic that returns bookable slots for a provider. This task makes the backend the source of truth for date and time options shown on `customer/:id`.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST expose `GET /provider/:id/availability` with `from`, `to`, and optional `serviceId`.
- MUST derive candidate slots only from active provider services.
- MUST exclude slots already occupied by `PENDENTE` or `CONFIRMADO` orders.
- MUST keep `CANCELADO` and `CONCLUIDO` orders from blocking future slots.
- MUST return empty or unavailable days when availability data is missing or malformed.
- MUST ensure route ordering does not shadow `by-category` or availability paths.
</requirements>

## Subtasks
- [ ] 2.1 Add availability endpoint to `ProviderController`.
- [ ] 2.2 Add provider availability service method.
- [ ] 2.3 Parse service availability into date-range slots.
- [ ] 2.4 Query conflicting orders for the selected provider/service range.
- [ ] 2.5 Return normalized days and slots for the frontend.
- [ ] 2.6 Cover malformed availability and empty state behavior.

## Implementation Details
Follow the TechSpec "API Endpoints" and "Data Models" sections. Keep slot generation inside `ProviderService` unless a clear local helper reduces complexity.

### Relevant Files
- `apps/backend/src/modules/provider/provider.controller.ts` — endpoint definition.
- `apps/backend/src/modules/provider/provider.service.ts` — slot generation and conflict filtering.
- `apps/backend/src/prisma/schema.prisma` — existing `Service.availability` and `Order.scheduledFor` fields.
- `apps/backend/src/modules/order/entities/order.entity.ts` — order status semantics if needed.

### Dependent Files
- `apps/backend/src/modules/provider/provider.controller.spec.ts` — endpoint coverage.
- `apps/backend/src/modules/provider/provider.service.spec.ts` — service slot calculation coverage.
- `apps/backend/src/modules/order/order.service.ts` — later order validation depends on the slot contract.

### Related ADRs
- [ADR-001: Provider Availability Slots as Backend Source of Truth](adrs/adr-001.md) — requires server-side slot ownership.

## Deliverables
- Provider availability endpoint.
- Backend slot generation and conflict filtering.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for availability endpoint **(REQUIRED)**

## Tests
- Unit tests:
  - [ ] Active service availability produces expected slots for a three-day range.
  - [ ] Existing `PENDENTE` order removes the matching slot.
  - [ ] Existing `CONFIRMADO` order removes the matching slot.
  - [ ] Existing `CANCELADO` order does not remove the slot.
  - [ ] Malformed availability returns unavailable days without throwing.
- Integration tests:
  - [ ] `GET /provider/:id/availability?from=2026-06-22&to=2026-06-28` returns normalized days and slots.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Frontend can request provider slots through a stable API.
- Occupied slots are excluded from the response.
