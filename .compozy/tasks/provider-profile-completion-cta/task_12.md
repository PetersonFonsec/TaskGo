---
status: pending
title: "Implement server-derived profile-completion query"
type: backend
complexity: high
dependencies:
  - task_03
  - task_05
  - task_07
  - task_09
  - task_11
---

# Task 12: Implement server-derived profile-completion query

## Overview

Implement the authenticated, server-derived read model that combines authoritative payout, photo, social-link, and owned-address state into the provider's five checklist items. The query must return stable item statuses, separate required and recommended progress, `payoutReady`, and `allComplete` without exposing gateway data, profile values, sensitive identifiers, or frontend navigation concerns.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- `GET /provider/me/profile-completion` MUST require authentication and the `PRESTADOR` role, derive the provider ID exclusively from the task 04 identity boundary, and MUST NOT accept a caller-selected user or provider ID.
- The response MUST contain exactly the task 02 item identifiers `BANK_ACCOUNT`, `PHOTO`, `SOCIAL_LINKS`, and `ADDRESS`, with each status derived from current authoritative server state on every query.
- Bank-account status MUST derive from the safe gateway synchronization state persisted by tasks 03 and 07; recipient existence alone MUST NOT mark it complete or make the provider payout-ready.
- Photo completion MUST derive from the successfully persisted managed-photo URL delivered by task 11, social completion MUST use the canonical task 09 rule of at least one valid structured field, and address completion MUST require at least one address owned by the authenticated user through the secured task 05 boundary.
- The required group MUST count the completed bank item out of one, the recommended group MUST count completed photo, social, and address items out of three, and processing or error items MUST NOT increase completed counts.
- `payoutReady` MUST be true only when both required financial items are gateway-confirmed complete; `allComplete` MUST be true only when all five items are complete, independently of payout readiness.
- The response MUST expose only stable statuses, completion counts, booleans, and required/recommended classification; it MUST NOT include raw or masked financial values, social values, address or photo values, gateway payloads, database identifiers, error details, or frontend routes.
- The service MUST apply one documented truth table consistently for missing, pending, processing, complete, and error source states, including providers whose related records do not yet exist.
</requirements>

## Subtasks

- [ ] 12.1 Define the complete truth table mapping authoritative source states to the five stable checklist statuses.
- [ ] 12.2 Aggregate payout profile, managed photo, canonical social completion, and owned-address existence for the authenticated provider.
- [ ] 12.3 Calculate required and recommended completed counts, `payoutReady`, and `allComplete` from the five item results.
- [ ] 12.4 Expose the singular provider-only profile-completion query using token-derived identity.
- [ ] 12.5 Limit serialization to the public completion contract and exclude all domain values, identifiers, routes, and sensitive metadata.
- [ ] 12.6 Add unit truth-table coverage and authenticated integration coverage for incomplete, partial, processing, error, payout-ready, and fully complete states.

## Implementation Details

Follow the TechSpec sections “Core Interfaces,” “Data Flow,” “Completion Response,” and “API Endpoints,” using the approved singular `/provider/me` route convention. Add a focused completion read service in the provider domain rather than extending the cached login payload or provider-home dashboard. Use the task 02 public response contract as the only serialized shape.

Read authoritative persisted state produced by the dependent tasks and keep the query side-effect free: it must not create recipients, refresh the gateway, upload a photo, normalize social values, or mutate addresses. The financial status refresh remains in tasks 07 and 08. Reuse task 09's canonical social-completion result and task 05's ownership constraint so the query does not introduce duplicate validation or unsafe address filtering.

### Relevant Files

- `apps/backend/src/modules/provider/provider.controller.ts` — Hosts the singular authenticated provider route and must serialize only the focused completion contract.
- `apps/backend/src/modules/provider/provider.module.ts` — Registers the completion read service and its dependencies within the provider domain.
- `apps/backend/src/prisma/schema.prisma` — Defines provider payout, structured social, user photo, and address relations that constitute authoritative persisted state.
- `apps/backend/src/modules/address/address.service.ts` — Supplies the secured owned-address semantics established by task 05.

### Dependent Files

- `libs/shared/src/auth-profile/index.ts` — Supplies the task 02 item identifiers, statuses, group progress, and aggregate completion response.
- `apps/backend/src/modules/provider/profile-completion.service.ts` — Focused server-derived completion aggregator to create.
- `apps/backend/src/modules/provider/profile-completion.service.spec.ts` — Truth-table and safe-serialization test suite to create.

### Related ADRs

- [ADR-001: Centralized Provider Profile Completion Journey](adrs/adr-001.md) — Defines the two checklist groups, their five items, and persistent visibility until every item is complete.
- [ADR-002: Gateway-Owned Provider Payout Data](adrs/adr-002.md) — Requires financial completion to follow gateway-confirmed state without exposing payout values.
- [ADR-003: Server-Derived Profile Completion Resource](adrs/adr-003.md) — Establishes a dedicated authenticated query, stable item identifiers, and independent refreshable state.

## Deliverables

- Documented and implemented truth table for all five item statuses across missing, pending, processing, complete, and error source states.
- Side-effect-free provider completion service that aggregates authoritative payout, photo, social, and owned-address state.
- Authenticated provider-only `GET /provider/me/profile-completion` endpoint using token-derived identity.
- Exact required and recommended progress calculations plus explicit `payoutReady` and `allComplete` results.
- Safe completion serialization containing no financial, social, address, photo, gateway, identifier, error-detail, or route values.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for authenticated server-derived profile completion **(REQUIRED)**

## Tests

- Unit tests:
  - [ ] A provider with no payout profile, photo, social values, or addresses receives five pending items, required `0/2`, recommended `0/3`, `payoutReady: false`, and `allComplete: false`.
  - [ ] Every bank state in the truth table yields the expected item status; only complete yields required `1/1` and `payoutReady: true`.
  - [ ] Recipient ID alone, pending bank, rejected bank, and error states never produce payout readiness or increment the required completion count.
  - [ ] Each recommended item independently changes recommended progress by one when its authoritative condition becomes complete.
  - [ ] One valid canonical social field marks `SOCIAL_LINKS` complete, while four null or empty fields mark it pending.
  - [ ] One address owned by the authenticated user marks `ADDRESS` complete, while an address owned only by another user does not.
  - [ ] A successfully persisted managed photo URL marks `PHOTO` complete; a missing URL or failed/uncommitted upload leaves it pending.
  - [ ] `allComplete` is true only for five complete items and remains false when payout is ready but any recommended item is pending.
  - [ ] Serialized output contains exactly the completion contract fields and excludes sentinel account, Pix, social, address, photo, gateway, database-ID, and route values.
- Integration tests:
  - [ ] An authenticated `PRESTADOR` receives exactly five items and correct two-group progress derived from its persisted payout profile, user, provider, and owned addresses.
  - [ ] An authenticated `CLIENTE` receives `403` and an anonymous request receives `401`.
  - [ ] Query or body attempts to inject another `providerId` or `userId` cannot change the provider whose state is read.
  - [ ] Two providers with different payout, photo, social, and address states receive isolated completion responses with no cross-provider data.
  - [ ] Updating a dependent domain and querying again returns current completion state without reauthentication or reliance on the cached login payload.
  - [ ] The query performs no Pagar.me call and no database create, update, or delete operation.
  - [ ] Providers created before the new related records exist receive a valid safe incomplete response rather than an exception.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- The endpoint returns exactly five server-derived items and mathematically correct `0..2` required and `0..3` recommended progress.
- `payoutReady` is true only after authoritative bank-account completion, while `allComplete` requires all four items.
- Anonymous, customer, and cross-provider requests cannot read provider completion state.
- Re-querying after a successful domain mutation reflects current persisted state without changing the authenticated session.
- Responses contain no route, sensitive value, profile value, gateway detail, or internal identifier, and the query produces no side effects.
