---
status: completed
title: Create immutable transactional audit writes
type: backend
complexity: high
dependencies:
    - task_01
    - task_03
---

# Task 04: Create immutable transactional audit writes

## Overview
Provide the shared service used by privileged commands to append minimal, attributable audit records inside their database transaction. The service establishes the common security contract for this and future operational verticals.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
1. MUST accept the validated AdminActor, action, target, minimal state deltas, reason, and request ID.
2. MUST write through the caller's Prisma transaction so audit failure rolls back the action.
3. MUST prohibit update and delete capabilities from the audit service.
4. MUST exclude passwords, tokens, invitation secrets, and complete personal records.
5. SHOULD capture IP address and user agent when available.
</requirements>

## Subtasks
- [ ] 04.1 Define the audit action and append-input contracts.
- [ ] 04.2 Implement append-only transactional persistence.
- [ ] 04.3 Add request correlation and safe contextual metadata.
- [ ] 04.4 Register the reusable audit module.
- [ ] 04.5 Verify rollback and sensitive-data exclusion behavior.

## Implementation Details
Follow TechSpec "AuditLog" and "Core Interfaces". The service receives a transaction client rather than starting an independent commit.

### Relevant Files
- `apps/backend/src/prisma/prisma.service.ts` — transaction boundary.
- `apps/backend/src/shared/shared.module.ts` — shared provider registration convention.
- `apps/backend/src/shared/filters/http-exception.filter.ts` — request error context.

### Dependent Files
- `apps/backend/src/main.ts` — request correlation registration.
- `apps/backend/src/tracing.ts` — trace correlation source.

### Related ADRs
- [ADR-004: Explicit Provider Commands With Transactional Audit](adrs/adr-004.md)
- [ADR-005: Comprehensive Backoffice Verification Gate](adrs/adr-005.md)

## Deliverables
- Append-only audit module and contracts.
- Request correlation context with sanitized metadata.
- Transaction rollback and privacy verification.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for atomic audit writes **(REQUIRED)**

## Tests
- Unit tests:
  - [ ] Input sanitization rejects known secret fields.
  - [ ] Actor role and request ID are preserved as snapshots.
- Integration tests:
  - [ ] Audit insert succeeds within a caller-owned transaction.
  - [ ] Forced audit failure rolls back the associated state mutation.
  - [ ] No application service exposes audit update or delete methods.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Every audit entry is attributable and correlation-searchable.
- No tested secret or full personal record reaches audit JSON.

