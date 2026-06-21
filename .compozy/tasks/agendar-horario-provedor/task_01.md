---
status: completed
title: Define Provider Availability Contracts
type: backend
complexity: medium
dependencies: []
---

# Task 1: Define Provider Availability Contracts

## Overview
Define the backend and shared frontend contracts for provider availability before implementation begins. This task establishes the DTOs, response shape, and expected `Service.availability` interpretation used by the booking screen.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST define query DTO validation for provider availability date range and optional service id.
- MUST define a response contract containing provider id, timezone, days, and slots.
- MUST document the MVP `Service.availability` JSON shape expected by backend parsing.
- MUST keep contracts compatible with ISO datetime values consumed by Angular.
- MUST reference ADR-001 for backend-owned availability semantics.
</requirements>

## Subtasks
- [ ] 1.1 Add backend DTOs for availability query and response concepts.
- [ ] 1.2 Add frontend TypeScript interfaces for availability responses.
- [ ] 1.3 Document expected availability JSON fields in code comments or nearby model documentation.
- [ ] 1.4 Add validation test cases for valid and invalid query params.

## Implementation Details
Create contracts referenced by the TechSpec "Core Interfaces" and "API Endpoints" sections. Keep the DTOs small and avoid adding new persistence models in this task.

### Relevant Files
- `apps/backend/src/modules/provider/provider.controller.ts` — future endpoint will consume the query DTO.
- `apps/backend/src/modules/provider/provider.service.ts` — service methods will return the response contract.
- `apps/frontend/src/app/shared/service/provider/provider.model.ts` — frontend availability interfaces should live beside provider request models.

### Dependent Files
- `apps/backend/src/modules/provider/provider.controller.spec.ts` — should cover query validation or endpoint behavior.
- `apps/frontend/src/app/modules/common/single-user/single-user.ts` — will consume the frontend model in later tasks.

### Related ADRs
- [ADR-001: Provider Availability Slots as Backend Source of Truth](adrs/adr-001.md) — establishes backend-owned slot contracts.

## Deliverables
- Backend availability query DTO and response types.
- Frontend provider availability interfaces.
- Documentation of MVP availability JSON expectations.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for provider availability query validation **(REQUIRED)**

## Tests
- Unit tests:
  - [ ] Query with valid `from`, `to`, and `serviceId` is accepted.
  - [ ] Query with missing `from` or `to` is rejected.
  - [ ] Query with invalid date format is rejected.
- Integration tests:
  - [ ] Provider availability endpoint can bind a valid DTO once the route exists.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Contracts are available for backend and frontend implementation tasks.
- DTO validation prevents malformed date-range requests.
