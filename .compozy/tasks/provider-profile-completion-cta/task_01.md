---
status: completed
title: "Validate Pagar.me recipient, bank-account, and Pix payout capabilities"
type: chore
complexity: medium
dependencies: []
---

# Task 1: Validate Pagar.me recipient, bank-account, and Pix payout capabilities

## Overview

Establish verified contract evidence for the Pagar.me recipient onboarding, bank-account, payout Pix-key, status, idempotency, and masking capabilities required by the provider completion flow. This capability spike is a hard gate for the financial implementation tasks: it must leave reproducible, sanitized findings in the repository and resolve any mismatch between actual gateway semantics and the approved design before downstream work begins.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- The spike MUST verify, against authoritative Pagar.me Core API v5 documentation and deterministic sanitized contract evidence, the supported lifecycle for recipient creation or retrieval, bank-account configuration, recipient status retrieval, and the absence of a documented payout Pix-key operation.
- The evidence MUST distinguish a Pix payment charge from a Pix key used for provider payout; support for one MUST NOT be treated as evidence for the other.
- Because the gateway's recipient-mutation idempotency contract is not publicly documented, the spike MUST record it as unverified and require TaskGo-owned idempotency and recipient reconciliation for replay and conflicting payloads.
- Checked-in request and response fixtures MUST be sanitized and MUST exclude secret keys, full documents, account and branch numbers, complete Pix keys, or other credentials.
- The findings MUST identify which gateway fields can safely support TaskGo's local recipient identifier, synchronization state, bank completion, Pix completion, masked metadata, and non-sensitive error mapping.
- If Pagar.me does not expose the assumed payout Pix-key operation, or its recipient/bank semantics materially differ from the TechSpec, ADR-002 and the affected TechSpec sections MUST be updated and approved before tasks that depend on this spike proceed.
- Automated contract checks MUST detect fixture/schema drift and sensitive-data leakage, and the spike test scope MUST achieve at least 80% coverage.
</requirements>

## Subtasks

- [x] 1.1 Record the configured Pagar.me API version, sandbox prerequisites, tested account capabilities, and authoritative documentation references.
- [x] 1.2 Validate recipient creation/retrieval, bank-account association, payout Pix-key behavior, and recipient/readiness status using official documentation and deterministic accepted/rejected contract cases.
- [x] 1.3 Record the undocumented gateway idempotency behavior and define TaskGo-owned replay, conflict, and recipient-reconciliation requirements.
- [x] 1.4 Check in sanitized request/response fixtures and a capability matrix that maps gateway evidence to the TaskGo completion states.
- [x] 1.5 Define the confirmed gateway contract, safe local metadata, status mapping, and error categories consumed by downstream tasks.
- [x] 1.6 Reconcile any gateway capability mismatch by updating the applicable ADR and TechSpec decisions before declaring the hard gate passed.

## Implementation Details

Follow the TechSpec sections “Integration Points — Pagar.me,” “Data Models — Provider payout profile,” and “Development Sequencing.” The current `PagarmeService` only covers order charges and split payments; this task validates the missing recipient/payout contracts without adding the production onboarding implementation owned by later tasks.

Check in a concise capability report under the feature directory or the repository’s integration documentation, plus sanitized fixtures and executable contract assertions alongside backend tests. Deterministic sanitized fixtures and official documentation are the completion evidence. Live sandbox verification remains an optional diagnostic that must skip safely when credentials are unavailable. Treat a missing payout Pix-key capability and undocumented gateway idempotency as design results, not as tests to bypass.

### Relevant Files

- `apps/backend/src/modules/payments/pagarme.service.ts` — Existing Core v5 authentication, request, simulation, and error-handling boundary that establishes the current gateway assumptions.
- `apps/backend/src/modules/payments/payment.service.ts` — Current payment readiness depends only on `pagarmeRecipientId`, showing the downstream behavior that the verified capability contract must replace.
- `config/backend.env` — Existing Pagar.me base URL, secret, simulation, and platform recipient configuration whose optional sandbox prerequisites must be documented without checking in credentials.

### Dependent Files

- `apps/backend/test/fixtures/pagarme-payout-capabilities.fixture.ts` — Sanitized accepted, rejected, replayed, and conflicting contract evidence to create for deterministic checks.
- `apps/backend/src/modules/payments/pagarme-payout-capabilities.contract.spec.ts` — Contract and redaction assertions to create around the checked-in evidence, with an opt-in sandbox verification boundary.
- `.compozy/tasks/provider-profile-completion-cta/_techspec.md` — Must be updated only when verified gateway behavior changes the proposed payout API, state model, or sequencing.

### Related ADRs

- [ADR-002: Gateway-Owned Provider Payout Data](adrs/adr-002.md) — Makes Pagar.me authoritative but explicitly requires this spike to confirm payout Pix-key and recipient capabilities.
- [ADR-003: Server-Derived Profile Completion Resource](adrs/adr-003.md) — The completion resource depends on stable, verified gateway state for the bank-account item.

## Deliverables

- A checked-in capability matrix with API version, optional sandbox prerequisites, documentation references, recipient/bank/Pix/status semantics, and a clear pass/fail decision for each required capability.
- Sanitized request/response fixtures covering accepted, rejected, idempotent replay, and conflicting financial operations.
- An executable gateway contract evidence suite that runs deterministically in CI and supports an explicitly enabled sandbox verification mode.
- A documented mapping from verified gateway fields and states to safe TaskGo metadata, completion indicators, and non-sensitive error categories.
- Updated ADR-002 and affected TechSpec sections when gateway payout Pix semantics or recipient/bank behavior differs materially from the approved assumptions.
- An explicit hard-gate outcome stating either that tasks 02, 03, 06, 07, and 08 may proceed or which approved design change is still required.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration-style deterministic contract tests for Pagar.me payout capabilities **(REQUIRED)**

## Tests

- Unit tests:
  - [x] Sanitized accepted-recipient and bank-account fixtures satisfy the documented required field and status contract.
  - [x] A fixture containing a full CPF/CNPJ, account number, branch number, Pix key, authorization header, or secret key fails the redaction assertion.
  - [x] Recipient responses in each documented deterministic state map to exactly one TaskGo synchronization category.
  - [x] Bank-account and payout Pix-key fixtures remain separate from Pix charge fixtures and cannot be misclassified as one another.
  - [x] Known gateway rejection fixtures map to non-sensitive, stable error categories while unknown responses remain safely classified.
- Integration tests:
  - [x] Deterministic recipient fixtures expose only documented identifier and status fields without leaking submitted financial values.
  - [x] Deterministic bank fixtures cover accepted or processing state and a stable validation-rejection category.
  - [x] The payout Pix-key capability records an unsupported outcome and cannot be confused with a customer Pix charge.
  - [x] Undocumented gateway idempotency records TaskGo-owned replay and conflict handling as a downstream requirement rather than assuming gateway protection.
  - [x] The optional live suite skips with an explicit reason while all required deterministic contract checks still run.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- Every required recipient, bank-account, payout Pix-key, status, idempotency, masking, and rejection capability has sanitized, reproducible evidence and an unambiguous supported/unsupported outcome.
- No checked-in fixture, test output, report, or log contains credentials or complete provider financial identifiers.
- Downstream financial tasks have a confirmed contract and safe state mapping, or are explicitly blocked by an approved ADR/TechSpec revision.
- The capability report records the exact API version, authoritative references, deterministic evidence, and optional sandbox context so another engineer can reproduce the decision.
