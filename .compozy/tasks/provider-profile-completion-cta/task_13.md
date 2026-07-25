---
status: pending
title: Add Angular profile-completion state and domain clients
type: frontend
complexity: high
dependencies:
  - task_02
  - task_08
  - task_09
  - task_11
  - task_12
---

# Task 13: Add Angular profile-completion state and domain clients

## Overview
Add the Angular data layer that loads, caches, invalidates, and refetches the server-derived provider profile-completion resource. Supply focused clients for payout, social, photo, and address mutations plus a stable item-to-route mapping so the home CTA and centralized journey can share current state without extending or depending on the cached login aggregate.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- 1. A provider-scoped Angular service MUST expose signal-based completion data, loading, error, freshness, and derived readiness/completion state from `GET /provider/me/profile-completion`.
- 2. The service MUST deduplicate concurrent loads, reuse a valid in-memory result, support an explicit forced refetch, and prevent stale or superseded responses from overwriting newer state.
- 3. Successful bank, social-links, photo, and address mutations MUST invalidate the completion cache and trigger or enable a current refetch; failed mutations MUST preserve the last valid completion snapshot.
- 4. Financial and social clients MUST use the singular `/provider/me` APIs, while photo and address clients MUST use singular `/user/me` APIs; no client method MAY send an acting user or provider ID.
- 5. All request and response shapes MUST come from the shared contracts established by task 02 and the domain APIs completed by tasks 08, 09, 11, and 12.
- 6. The frontend MUST map the five stable completion item identifiers to application-owned destinations; backend response data MUST NOT supply or override Angular routes.
- 7. Profile completion MUST remain independent from `UserLoggedService`, local-storage login data, and provider-home login payloads.
- 8. The state layer MUST expose deterministic initial, loading, loaded, refresh, and recoverable-error behavior suitable for both task 14 and task 15 consumers.
</requirements>

## Subtasks
- [ ] 13.1 Define the signal-based profile-completion query state and its public read-only selectors.
- [ ] 13.2 Implement initial load, in-memory reuse, concurrent-request deduplication, invalidation, and forced refetch behavior.
- [ ] 13.3 Add provider-domain clients for bank account, payout status, and structured social-link mutations.
- [ ] 13.4 Add user-domain clients for multipart profile-photo and authenticated address operations.
- [ ] 13.5 Connect successful domain mutations to completion invalidation and refresh while preserving valid state on errors.
- [ ] 13.6 Define the exhaustive frontend-owned mapping from completion item identifiers to provider journey destinations.
- [ ] 13.7 Add unit and integration coverage for HTTP contracts, signal transitions, caching, refresh ordering, and route mapping.

## Implementation Details
Add a focused provider profile-completion state service near the existing shared frontend services and follow the workspace’s Angular `signal`/`computed` and `HttpClient` conventions. Refer to the TechSpec “Data Flow,” “API Endpoints,” and “Frontend routes do not appear in the API contract” guidance. Import all new payload types from `@taskgo/shared`, and use the singular API convention approved during task breakdown.

Extend or introduce only the focused domain clients needed by tasks 14 and 15. The current `Address` client sends `userId`, and current `User`/`Provider` clients use ID-addressed routes; new authenticated operations must not repeat those ownership patterns. Do not add UI components or routes in this task. Do not update `UserLoggedService` after a mutation: completion freshness belongs entirely to the new query state.

### Relevant Files
- `apps/frontend/src/app/shared/service/provider/provider.ts` — Existing provider HTTP client and singular `/provider` base convention.
- `apps/frontend/src/app/shared/service/address/address.ts` — Existing ID/query-based address client that new authenticated `/user/me` operations must avoid.
- `apps/frontend/src/app/shared/service/users/user.ts` — Existing user HTTP client and location for focused authenticated photo operations.
- `apps/frontend/src/app/shared/service/user-logged/user-logged.service.ts` — Cached login state that must remain independent from profile completion.

### Dependent Files
- `apps/frontend/src/app/modules/providers/providers.routes.ts` — Owns provider destinations consumed by the stable item-to-route mapping in tasks 14 and 15.
- `apps/frontend/src/app/modules/providers/home/home.ts` — Task 15 consumes shared completion state without owning its fetch lifecycle.
- `apps/frontend/src/app/shared/service/provider/provider.spec.ts` — Existing `HttpTestingController` conventions for provider-client request verification.

### Related ADRs
- [ADR-003: Server-Derived Profile Completion Resource](adrs/adr-003.md) — Requires an independently refreshable Angular completion resource, focused domain mutations, and frontend-owned route mapping.

## Deliverables
- Signal-based profile-completion service exposing read-only data, readiness, completeness, loading, refreshing, stale, and error state.
- Deterministic load, cache reuse, request deduplication, invalidation, forced refetch, and stale-response protection.
- Focused singular-route clients for payout, social links, profile photo, and authenticated addresses.
- Automatic completion invalidation/refetch integration after every successful checklist-domain mutation.
- Exhaustive stable item-to-provider-destination mapping that does not accept backend route data.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for Angular completion state and domain HTTP clients **(REQUIRED)**

## Tests
- Unit tests:
  - [ ] Initial state contains no completion data, is not loading, has no error, and derives neither payout readiness nor overall completion.
  - [ ] The first load calls `GET /provider/me/profile-completion` and transitions from loading to a loaded snapshot matching the shared response.
  - [ ] Two concurrent load calls issue one HTTP request, and a later non-forced load reuses the valid cached snapshot.
  - [ ] Invalidation marks the snapshot stale, while forced refetch issues a new request even when cached data exists.
  - [ ] When an older request resolves after a newer forced refetch, the older response cannot overwrite the newer signal state.
  - [ ] A refresh failure exposes a recoverable error while preserving the last valid snapshot; a first-load failure leaves data empty.
  - [ ] Every canonical item ID maps to exactly one provider-owned destination, and unknown runtime values fall back safely without using a backend URL.
  - [ ] Completion state never reads from or writes to `UserLoggedService` or browser login storage.
- Integration tests:
  - [ ] Bank-account, payout-status, and social-link methods call their exact singular `/provider/me` endpoints without user/provider IDs in URL, query, or payload.
  - [ ] Photo upload sends multipart data to `/user/me/photo`, and address methods call singular `/user/me/addresses` routes without an acting `userId`.
  - [ ] Each successful domain mutation invalidates and refetches completion so subscribers observe the updated server snapshot.
  - [ ] A `400`, `409`, `422`, or gateway availability failure from a domain mutation does not invalidate the last valid completion snapshot and exposes the original actionable error to the caller.
  - [ ] Multiple consumers representing the home and centralized journey share one completion request and observe the same refreshed signals.
  - [ ] Shared request and response types compile through `@taskgo/shared` with no duplicate local completion model.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Home and centralized journey consumers share one current, independently refreshable completion state.
- Successful checklist mutations make updated server state observable without reauthentication or page reload.
- No new authenticated mutation sends an acting provider or user ID.
- Every checklist item resolves through an exhaustive frontend-owned route mapping.
- `UserLoggedService` and its local-storage payload remain free of completion data and cache responsibilities.
