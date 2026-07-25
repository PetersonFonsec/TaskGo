---
status: pending
title: "Extend the Pagar.me adapter for recipient payout configuration"
type: backend
complexity: high
dependencies:
  - task_01
  - task_02
---

# Task 06: Extend the Pagar.me adapter for recipient payout configuration

## Overview

Extend the existing Pagar.me gateway boundary with the recipient, bank-account, and recipient-status operations confirmed by the task 01 capability spike. The adapter must expose stable, safe results to TaskGo while supporting TaskGo-owned idempotency, bounded transient retry, deterministic simulation, and strict protection of provider financial data.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- The Pagar.me adapter MUST implement only the recipient creation/retrieval, bank-account configuration, and status operations verified by task 01, using the request and response contracts defined by task 02.
- Every supported mutation MUST forward a caller-provided idempotency key according to the gateway contract, and MUST preserve the gateway's confirmed replay and conflict semantics without creating duplicate resources.
- The adapter MUST map gateway-specific payloads and lifecycle states into stable TaskGo results containing identifiers, synchronization status, completion indicators, approved masked metadata, correlation identifiers, and non-sensitive error codes only.
- Transient transport, rate-limit, and server failures MUST use a bounded retry policy consistent with task 01 evidence; validation, authorization, idempotency-conflict, and other permanent failures MUST NOT be retried.
- Simulation mode MUST provide deterministic recipient, bank, and status outcomes needed by local development and CI without issuing network requests or returning realistic sensitive values.
- Raw documents, account and branch numbers, credentials, authorization headers, and unfiltered gateway bodies MUST NOT appear in adapter return values, exceptions, logs, snapshots, or test diagnostics.
- Existing order charge, capture, cancellation, refund, and webhook behavior MUST remain compatible, and the adapter MUST be available to the downstream payout synchronization service through the payments module boundary.
</requirements>

## Subtasks

- [ ] 06.1 Add the task-01-confirmed recipient and payout operations to the Pagar.me adapter boundary using the shared task 02 contracts.
- [ ] 06.2 Map recipient, bank, and gateway error states into stable safe results with only approved masked metadata.
- [ ] 06.3 Apply caller-supplied idempotency semantics and bounded retry behavior to the eligible operations.
- [ ] 06.4 Provide complete deterministic simulation outcomes for supported, processing, rejected, replayed, and unavailable payout scenarios.
- [ ] 06.5 Enforce response, exception, diagnostic, and log sanitization across all new financial operations.
- [ ] 06.6 Export the adapter for the payout synchronization layer while preserving all existing payment gateway behavior.
- [ ] 06.7 Add unit and integration coverage for contracts, retries, idempotency, simulation, serialization, and sensitive-data protection.

## Implementation Details

Follow the TechSpec sections “Core Interfaces,” “Integration Points — Pagar.me,” and “Known Risks.” Task 01 is authoritative for supported endpoints, fields, headers, states, and retryable conditions; do not infer payout readiness from the existing Pix charge flow. Consume the public task 02 contracts instead of exposing raw Pagar.me shapes beyond the adapter.

Keep the new operations within the current payments gateway boundary unless the task 01 evidence requires a focused adjacent adapter type. The downstream orchestration, persistence, authenticated provider endpoints, and final completion calculation belong to tasks 07, 08, and 12. Preserve the current simulation default when gateway credentials are absent, but make simulated payout state controllable and deterministic for tests.

### Relevant Files

- `apps/backend/src/modules/payments/pagarme.service.ts` — Existing Core v5 request boundary, simulation behavior, and order-payment operations to extend without regression.
- `apps/backend/src/modules/payments/payments.module.ts` — Current module exports only `PaymentService`; downstream payout synchronization needs the gateway boundary exposed through this module.
- `apps/backend/src/modules/payments/payment.service.spec.ts` — Existing payment service coverage that must continue passing after the adapter and module boundary change.
- `apps/backend/src/observability/log-sanitizer.ts` — Existing structured-log redaction behavior that the new adapter diagnostics must respect.

### Dependent Files

- `libs/shared/src/auth-profile/index.ts` — Supplies the task 02 payout request and safe masked response vocabulary consumed by the adapter.
- `apps/backend/test/fixtures/pagarme-payout-capabilities.fixture.ts` — Supplies sanitized, task-01-verified gateway responses for deterministic adapter contract tests.
- `apps/backend/src/modules/payments/pagarme.service.spec.ts` — Unit and mocked-integration coverage to create for payout operations, retry boundaries, simulation, and safe serialization.

### Related ADRs

- [ADR-002: Gateway-Owned Provider Payout Data](adrs/adr-002.md) — Requires Pagar.me to remain authoritative while TaskGo receives only safe status and masked metadata.
- [ADR-003: Server-Derived Profile Completion Resource](adrs/adr-003.md) — Requires stable bank-account completion state that the server-derived completion resource can consume.

## Deliverables

- Pagar.me adapter operations for the task-01-confirmed recipient, bank-account, and recipient-status lifecycle.
- Stable gateway result and error mappings that expose only identifiers, statuses, approved masked metadata, correlation identifiers, and non-sensitive codes.
- Caller-controlled idempotency propagation and bounded retry handling restricted to confirmed transient failures.
- Deterministic simulation coverage for every payout state required by downstream development and CI.
- Sensitive-data-safe errors, logs, snapshots, and serialized adapter results, with regression protection for existing order payment operations.
- Payments module export usable by the task 07 synchronization service without bypassing the established gateway boundary.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for Pagar.me adapter request/response behavior **(REQUIRED)**

## Tests

- Unit tests:
  - [ ] Recipient creation maps the task 01 accepted fixture to the expected recipient identifier and synchronization state without exposing submitted document data.
  - [ ] Bank-account configuration returns only the confirmed completion state and approved masked label or final digits; the serialized result excludes full branch and account values.
  - [ ] Recipient-status retrieval maps every confirmed processing, ready, rejected, and unavailable gateway state to the stable TaskGo result.
  - [ ] Repeating a mutation with the same idempotency key forwards the same gateway header and result, while a confirmed conflicting replay maps to the stable non-sensitive conflict error.
  - [ ] A network timeout, confirmed rate-limit response, and retryable 5xx response stop at the configured maximum attempt count; a 4xx validation rejection performs exactly one attempt.
  - [ ] Simulation mode performs no fetch calls and returns deterministic recipient, bank, and status values for each configured scenario.
  - [ ] Thrown errors, logs, snapshots, and JSON serialization exclude secret keys, authorization values, full CPF/CNPJ, branch, and account test sentinels.
- Integration tests:
  - [ ] A mocked Core v5 recipient request uses the task-01-confirmed method, path, authentication, content type, idempotency header, and request shape, then returns the stable safe contract.
  - [ ] Mocked bank operations send the confirmed contracts and map accepted, processing, validation-rejected, conflict, and transient-failure fixtures without leaking raw gateway bodies.
  - [ ] Recipient-status retrieval uses the persisted gateway recipient identifier and performs no mutation or retry for a successful response.
  - [ ] Existing Pix charge creation and card authorization tests still produce their prior split-payment contracts after the shared request path changes.
  - [ ] `PaymentsModule` resolves and exports the adapter for a consuming Nest test module without exposing gateway credentials.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- The adapter supports every recipient, bank, and status capability approved by task 01 and no unsupported gateway operation.
- Repeated financial mutations are idempotent, and transient retries are bounded and excluded for permanent failures.
- Simulation mode fully supports downstream payout development without external calls.
- No adapter result, error, log, snapshot, or test diagnostic exposes raw provider financial data or gateway credentials.
- Existing charge and split-payment behavior remains compatible, and task 07 can consume the adapter through `PaymentsModule`.
