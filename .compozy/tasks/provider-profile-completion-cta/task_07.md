---
status: pending
title: Implement provider payout synchronization service
type: backend
complexity: high
dependencies:
  - task_03
  - task_04
  - task_06
---

# Task 07: Implement provider payout synchronization service

## Overview
Implement the provider-domain service that coordinates Pagar.me recipient reconciliation with TaskGo’s safe local payout profile. The service must derive the provider from authenticated context, translate gateway results into stable synchronization and readiness state, and persist only identifiers, completion indicators, masked metadata, timestamps, and non-sensitive errors.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- 1. The synchronization service MUST resolve the acting provider from the authenticated identity established in task 04 and MUST NOT accept a caller-selected provider or user ID.
- 2. Pagar.me MUST remain authoritative for recipient and bank-account acceptance; local state MUST be derived from gateway-confirmed results supplied by the adapter from task 06.
- 3. Recipient synchronization MUST reuse and reconcile an existing `pagarmeRecipientId` before creating a recipient and MUST avoid duplicate gateway resources across retries.
- 4. Local persistence MUST contain only gateway identifiers, stable synchronization state, bank completion indicator, approved masked metadata, synchronization timestamps, and non-sensitive error codes defined by tasks 02 and 03.
- 5. Raw account numbers, branch numbers, gateway request bodies, credentials, documents, and unfiltered gateway responses MUST NOT be persisted, serialized, returned, or logged.
- 6. Payout readiness MUST become true only after the gateway confirms bank-account completion; recipient existence alone MUST NOT imply readiness.
- 7. Transient, rejected, pending, and successful gateway outcomes MUST map deterministically to stable local states without overwriting a previously valid recipient identifier with an unconfirmed value.
- 8. Synchronization updates MUST preserve a consistent local snapshot when a gateway request or persistence operation fails and MUST expose only actionable, non-sensitive status information to later API and completion-query tasks.
</requirements>

## Subtasks
- [ ] 07.1 Define the provider payout synchronization operations and their safe domain results.
- [ ] 07.2 Reconcile authenticated providers that already have a gateway recipient identifier before any recipient creation.
- [ ] 07.3 Coordinate bank-account synchronization and persist only confirmed completion state and approved masked metadata.
- [ ] 07.4 Coordinate recipient-status refresh and preserve the last safe bank-account state during transient gateway failures.
- [ ] 07.5 Calculate payout readiness and stable synchronization status from authoritative gateway outcomes.
- [ ] 07.6 Preserve non-sensitive failure state and retry-safe recipient identity across rejected, pending, and transient outcomes.
- [ ] 07.7 Add unit and integration coverage for reconciliation, synchronization, masking, readiness, and failure consistency.

## Implementation Details
Add a focused payout synchronization service within the provider domain and connect it to the Pagar.me adapter extended by task 06 and the payout-profile persistence introduced by task 03. Use the shared request and safe response vocabulary from task 02 and the authenticated identity boundary from task 04. Refer to the TechSpec sections “Core Interfaces,” “Data Models,” “Integration Points,” and “Known Risks” for the required state transitions and security boundary.

The existing payment flow treats `pagarmeRecipientId` as readiness; this task must establish the explicit safe readiness result that task 16 will later adopt in order payment checks. Keep HTTP concerns out of the service because task 08 owns financial endpoints. Do not store raw gateway payloads in the payout profile, reuse the payment module’s order-payment response behavior, or expose gateway-specific statuses to frontend consumers.

### Relevant Files
- `apps/backend/src/modules/provider/provider.service.ts` — Current provider-domain service and lookup conventions.
- `apps/backend/src/modules/provider/provider.module.ts` — Provider-domain dependency and export boundary for the synchronization service.
- `apps/backend/src/modules/payments/pagarme.service.ts` — Gateway adapter extended by task 06 with recipient and payout operations.
- `apps/backend/src/prisma/schema.prisma` — Payout profile and safe synchronization fields introduced by task 03.

### Dependent Files
- `apps/backend/src/modules/payments/payment.service.ts` — Currently equates recipient presence with readiness and will consume explicit readiness in task 16.
- `apps/backend/src/modules/provider/provider.service.spec.ts` — Existing provider service test conventions and Prisma mocking patterns.
- `libs/shared/src/index.ts` — Public safe status and masked-response contracts established by task 02.

### Related ADRs
- [ADR-002: Gateway-Owned Provider Payout Data](adrs/adr-002.md) — Makes Pagar.me authoritative and prohibits TaskGo from retaining raw financial values.
- [ADR-003: Server-Derived Profile Completion Resource](adrs/adr-003.md) — Requires token-derived provider identity, focused payout mutations, and stable safe status for the completion query.

## Deliverables
- Provider payout synchronization service covering recipient reconciliation, bank-account synchronization, and status refresh.
- Deterministic gateway-to-domain state mapping with explicit readiness requiring confirmed bank-account completion.
- Safe local persistence of identifiers, completion indicators, masked metadata, timestamps, and non-sensitive errors only.
- Retry-safe behavior that reuses known recipient identity and preserves consistent state across gateway or persistence failures.
- Service registration and exports needed by task 08 and task 12 without introducing HTTP coupling.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for provider payout synchronization with mocked Pagar.me and persisted payout state **(REQUIRED)**

## Tests
- Unit tests:
  - [ ] A provider with a valid persisted recipient ID is reconciled through gateway status retrieval and does not trigger recipient creation.
  - [ ] A provider without a recipient creates one once, persists the confirmed identifier, and reuses it when the same synchronization is retried.
  - [ ] A gateway-confirmed bank account stores completion, an approved masked label or final digits, and a synchronization timestamp without storing the submitted account or branch.
  - [ ] Readiness is false for recipient-only, pending-bank, rejected-bank, and error states and true only when the bank account is gateway-confirmed.
  - [ ] A transient gateway failure records only the stable non-sensitive error code, preserves a known recipient ID, and does not mark either financial item complete.
  - [ ] A rejected gateway result maps to the expected safe domain state without exposing gateway request data or unfiltered response fields.
  - [ ] Supplying another provider identifier in a financial payload cannot change the authenticated provider selected by the service boundary.
- Integration tests:
  - [ ] An authenticated `PRESTADOR` with an existing `pagarmeRecipientId` is reconciled against a mocked gateway and updates only the matching local payout profile.
  - [ ] Repeating recipient synchronization with the same provider and idempotency context leaves one local payout profile and one gateway recipient.
  - [ ] Successful bank synchronization persists a ready local snapshot whose serialized service result contains only status and masked metadata.
  - [ ] A mocked gateway timeout leaves the previous confirmed local snapshot intact while recording a retryable, non-sensitive synchronization failure.
  - [ ] An authenticated `CLIENTE` or missing provider identity cannot invoke synchronization or mutate payout profile state.
  - [ ] Persistence inspection confirms that known raw bank values, gateway credentials, and raw gateway payload fields are absent.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Recipient synchronization is idempotent and reconciles existing provider identifiers before creation.
- Payout readiness is true only when Pagar.me confirms bank-account completion.
- Every persisted and serialized payout value is either a gateway identifier, stable status, completion indicator, approved masked value, timestamp, or non-sensitive error code.
- Gateway and persistence failures preserve a consistent prior snapshot and never leak financial secrets.
- Only the authenticated provider can synchronize its payout profile.
