---
status: completed
title: Implement audited provider lifecycle commands
type: backend
complexity: high
dependencies:
  - task_04
  - task_06
---

# Task 07: Implement audited provider lifecycle commands

## Overview
Implement explicit approve, reject, block, and unblock commands under the administrative provider boundary. Each command must enforce its state transition, authorization, justification, compatibility flag, decision history, and audit record in one transaction.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
1. MUST expose the four explicit command endpoints defined in TechSpec "Providers".
2. MUST allow only Administrator and require reasons for reject, block, and unblock.
3. MUST use conditional state transitions and return 409 for stale or invalid state.
4. MUST atomically update status and verified compatibility, append ProviderDecision, and append AuditLog.
5. MUST return a privacy-safe representation of the resulting state.
</requirements>

## Subtasks
- [x] 07.1 Define command DTOs and valid transition rules.
- [x] 07.2 Implement approve and reject commands.
- [x] 07.3 Implement block and unblock commands.
- [x] 07.4 Persist decision and audit records atomically.
- [x] 07.5 Enforce concurrent-command conflict behavior.
- [x] 07.6 Add transition, rollback, and authorization tests.

## Implementation Details
See TechSpec "Provider decisions" and ADR-004. Do not introduce a generic administrative status-update endpoint.

### Relevant Files
- `apps/backend/src/prisma/prisma.service.ts` — atomic transaction support.
- `apps/backend/src/modules/provider/provider.service.ts` — current provider mutation behavior.
- `apps/backend/src/modules/order/commands/confirm-order-completion/confirm-order-completion.handler.ts` — transactional command precedent.

### Dependent Files
- `apps/backend/src/modules/provider/provider.controller.ts` — public controller must not expose these commands.
- `apps/backend/test/e2e/order-lifecycle.e2e-spec.ts` — state-machine E2E pattern.

### Related ADRs
- [ADR-004: Explicit Provider Commands With Transactional Audit](adrs/adr-004.md)
- [ADR-005: Comprehensive Backoffice Verification Gate](adrs/adr-005.md)

## Deliverables
- Four explicit provider command endpoints and handlers.
- Transactional status, compatibility, decision, and audit persistence.
- Complete valid and invalid transition matrix.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for atomic provider commands **(REQUIRED)**

## Tests
- Unit tests:
  - [x] PENDING accepts approve/reject and rejects block/unblock.
  - [x] APPROVED accepts block and BLOCKED accepts unblock.
  - [x] Missing or blank required reason returns 422.
- Integration tests:
  - [x] Concurrent commands yield one success and one 409 without duplicate decisions.
  - [x] Forced audit failure leaves provider status and verified unchanged.
  - [x] Support, Finance, and Moderator receive 403 for every command.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Every successful command creates exactly one decision and one audit entry.
- No invalid transition changes provider state.
