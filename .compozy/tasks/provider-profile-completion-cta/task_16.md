---
status: pending
title: "Add payout reconciliation and profile-completion telemetry"
type: backend
complexity: high
dependencies:
  - task_07
  - task_12
---

# Task 16: Add payout reconciliation and profile-completion telemetry

## Overview

Complete the operational transition to explicit provider payout readiness by reconciling existing recipients in controlled, repeatable batches and updating order payment eligibility to use authoritative bank-and-Pix completion. Add redacted structured logs and low-cardinality metrics for reconciliation, payout state, profile completion, retries, divergence, and recovery so operators can detect and resolve failures without exposing financial or personal data.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- Reconciliation MUST select existing providers in bounded, deterministic batches, resume from an explicit checkpoint or cursor, and remain idempotent when the same provider or batch is processed again.
- Providers with an existing Pagar.me recipient identifier MUST be reconciled through the task 07 synchronization boundary before any recipient creation is considered, and providers without sufficient gateway identity MUST remain safely incomplete.
- Reconciliation MUST persist only the safe state transitions allowed by tasks 03 and 07; transient or partial failures MUST NOT erase a confirmed recipient identifier, bank completion, Pix completion, masked metadata, or a previously consistent readiness snapshot.
- The operation MUST isolate provider failures, apply bounded retry/recovery semantics, report per-state outcomes, and allow a later run to continue unresolved records without reprocessing successful records incorrectly.
- `PaymentService` MUST require explicit authoritative payout readiness before creating a customer payment while still using the confirmed recipient identifier for gateway split routing; recipient presence alone MUST no longer authorize payment.
- Telemetry MUST cover reconciliation attempts and outcomes, payout synchronization states, readiness transitions, profile-completion query outcomes, processing age, divergence, retry, and recovery using bounded-cardinality dimensions.
- Structured logs MUST pass through the repository sanitizer and MUST exclude documents, credentials, authorization data, bank and branch values, social/address/photo values, raw gateway payloads, and unfiltered exceptions.
- Metrics and logs MUST provide enough operational context to correlate an attempt and identify the affected provider safely, while provider IDs, recipient IDs, request IDs, and correlation IDs MUST NOT become unbounded metric labels.
</requirements>

## Subtasks

- [ ] 16.1 Define controlled batch selection, checkpoint, outcome, retry, and recovery behavior for existing-provider reconciliation.
- [ ] 16.2 Reconcile existing recipient records idempotently through the task 07 synchronization boundary while preserving safe confirmed state.
- [ ] 16.3 Replace recipient-ID-only order payment eligibility with explicit authoritative payout readiness.
- [ ] 16.4 Emit redacted structured reconciliation and state-transition logs with safe correlation context.
- [ ] 16.5 Publish bounded-cardinality payout, completion, divergence, processing-age, retry, recovery, and reconciliation metrics.
- [ ] 16.6 Expose actionable batch summaries and operational signals for unresolved, stale, and divergent providers.
- [ ] 16.7 Add unit and integration coverage for batching, replay, partial failure, recovery, readiness compatibility, telemetry, and redaction.

## Implementation Details

Follow the TechSpec sections “Development Sequencing,” “Monitoring and Observability,” “Impact Analysis,” and “Known Risks.” Reuse the task 07 synchronization service as the only gateway-to-local reconciliation boundary and the task 12 completion vocabulary for aggregate status reporting. Do not duplicate recipient creation, gateway mapping, or profile-completion truth tables in the operational layer.

Prefer an explicitly invoked and controllable reconciliation entry point over an always-on scheduler for the MVP. It must support dry-run or equivalent safe inspection, bounded batch size, deterministic ordering, resumable progress, and a machine-readable summary. Extend the existing observability service conventions and sanitizer rather than introducing a second metrics stack. Metric labels must use enums such as outcome, operation, status, and error category; identifiers belong only in sanitized structured logs.

### Relevant Files

- `apps/backend/src/modules/payments/payment.service.ts` — Currently treats `pagarmeRecipientId` alone as payout eligibility and must adopt explicit readiness.
- `apps/backend/src/modules/payments/payment.service.spec.ts` — Existing eligibility and split-payment tests to update for explicit readiness compatibility.
- `apps/backend/src/modules/provider/provider.module.ts` — Provider-domain registration and dependency boundary for reconciliation and synchronization services.
- `apps/backend/src/observability/admin-telemetry.service.ts` — Existing in-process counter, histogram, structured-log, and Prometheus rendering conventions to extend or generalize.

### Dependent Files

- `apps/backend/src/observability/log-sanitizer.ts` — Required redaction boundary for reconciliation and profile-completion structured logs.
- `apps/backend/src/modules/provider/provider-payout-reconciliation.service.ts` — Controlled batch reconciliation service to create.
- `apps/backend/src/modules/provider/provider-payout-reconciliation.service.spec.ts` — Batch, idempotency, recovery, state-safety, and telemetry test suite to create.

### Related ADRs

- [ADR-002: Gateway-Owned Provider Payout Data](adrs/adr-002.md) — Requires gateway-authoritative reconciliation, safe local state, and no raw payout-data retention.
- [ADR-003: Server-Derived Profile Completion Resource](adrs/adr-003.md) — Establishes stable completion states and independently refreshable server-derived status for operational measurement.

## Deliverables

- Controlled, bounded, resumable, and idempotent reconciliation operation for existing providers with dry-run or equivalent safe inspection and machine-readable summaries.
- Safe recovery behavior that preserves confirmed payout state, isolates individual failures, and permits later retries of unresolved providers.
- Updated order payment eligibility requiring explicit bank-and-Pix readiness while retaining the confirmed recipient identifier for gateway split routing.
- Redacted structured logs for reconciliation attempts, safe state transitions, divergence, retry, recovery, and terminal outcomes.
- Low-cardinality metrics for payout states, readiness transitions, reconciliation outcomes, stale processing, divergence, profile-completion outcomes, retry, and recovery.
- Operational verification that no metric or log contains financial values, profile values, gateway secrets, raw payloads, or unbounded identifier labels.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for payout reconciliation, payment readiness, and operational telemetry **(REQUIRED)**

## Tests

- Unit tests:
  - [ ] Deterministic batch selection honors the configured limit and cursor, orders providers consistently, and returns the next checkpoint without overlap or omission.
  - [ ] Replaying the same completed provider or batch does not create another recipient, duplicate a payout profile, or regress confirmed bank-account readiness.
  - [ ] An existing recipient identifier is reconciled before any creation path, while a provider with no usable gateway identity remains safely incomplete.
  - [ ] A transient gateway failure preserves the prior recipient ID, confirmed item states, masked metadata, and readiness snapshot and records only a retryable safe outcome.
  - [ ] One provider failure does not stop the remaining batch, and the summary reports separate succeeded, skipped, pending, retryable, and terminal counts.
  - [ ] A later run recovers a previously retryable provider, records the readiness transition once, and does not recount unchanged successful providers as new transitions.
  - [ ] Payment eligibility rejects recipient-only, pending-bank, rejected-bank, and error profiles and accepts only a ready profile with a confirmed recipient identifier and bank account.
  - [ ] Metric dimensions are restricted to approved low-cardinality outcome, operation, status, and error-category values and never include provider, recipient, request, or correlation IDs.
  - [ ] Structured log serialization redacts known CPF/CNPJ, account, branch, Pix, credential, authorization, profile-value, and raw-gateway sentinels while retaining safe operation and correlation context.
- Integration tests:
  - [ ] A bounded run over mixed existing providers reconciles each eligible recipient once, persists only safe states, returns the expected checkpoint, and produces the expected outcome summary.
  - [ ] Re-running the same batch after completion produces no duplicate gateway resources or readiness transitions and leaves persisted snapshots unchanged.
  - [ ] A batch containing one gateway timeout continues other providers; a subsequent run retries only unresolved work and records a successful recovery.
  - [ ] Attempting an order payment for a provider with only `pagarmeRecipientId` returns the existing unavailable-for-payment response without calling Pagar.me order creation.
  - [ ] An explicitly ready provider creates a payment with the confirmed recipient ID in the split, preserving existing Pix and card payment behavior.
  - [ ] The metrics endpoint exposes reconciliation, payout-state, completion, stale-processing, divergence, retry, and recovery series without sensitive values or high-cardinality identifiers.
  - [ ] Captured reconciliation and readiness logs contain sanitized provider/correlation context and exclude complete financial, profile, credential, and gateway fixture values.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- Existing recipients can be reconciled repeatedly in bounded resumable batches without duplicate resources, unsafe state regression, or loss of confirmed readiness.
- Order payments are blocked unless the bank-account requirement is authoritative and complete, while ready providers retain compatible split-payment behavior.
- Retryable failures are isolated and recoverable, stale or divergent states are measurable, and operators receive actionable batch summaries.
- Metrics use bounded dimensions, and no telemetry output exposes sensitive financial, profile, credential, gateway, or unbounded identifier data.
- Reconciliation and profile-completion operational state is visible enough to detect elevated failures, prolonged processing, divergence, and successful recovery.
