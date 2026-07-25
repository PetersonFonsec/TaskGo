---
status: pending
title: Expose idempotent payout mutation and status endpoints
type: backend
complexity: high
dependencies:
  - task_07
---

# Task 08: Expose idempotent payout mutation and status endpoints

## Overview
Expose authenticated provider APIs for bank-account configuration and payout-status refresh over the singular `/provider/me` route convention. The endpoints must validate inputs, enforce the `PRESTADOR` role, enforce TaskGo-owned idempotency across retries, translate domain and gateway failures into stable HTTP responses, and serialize only safe status and masked metadata.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- 1. The backend MUST expose `PUT /provider/me/payout/bank-account` and `GET /provider/me/payout/status` under the existing singular provider route convention.
- 2. Every endpoint MUST require a valid authenticated identity, MUST allow only users with the `PRESTADOR` role, and MUST derive provider ownership from the authenticated identity supplied by task 04.
- 3. Financial request bodies MUST NOT accept provider or user identifiers and MUST be validated against the task-02 contracts before invoking the task-07 synchronization service.
- 4. The financial mutation endpoint MUST require a non-empty idempotency key, pass it unchanged through the synchronization boundary, and return the original safe outcome when the same provider, operation, key, and payload are retried.
- 5. Reusing an idempotency key for a different operation or materially different payload MUST return `409 Conflict` without invoking a second gateway mutation.
- 6. Successful mutation and status responses MUST contain only stable domain status, readiness, approved masked bank metadata, safe timestamps, and non-sensitive error codes.
- 7. Responses, exceptions, and logs MUST NOT expose complete bank account or branch numbers, credentials, documents, raw gateway requests, or unfiltered gateway responses.
- 8. Input validation failures, including missing or malformed idempotency keys, MUST map to `400 Bad Request`; authenticated non-provider access MUST map to `403 Forbidden`.
- 9. Local association or idempotency conflicts MUST map to `409 Conflict`; business validation rejected by Pagar.me MUST map to `422 Unprocessable Entity`.
- 10. Unexpected or invalid upstream gateway responses MUST map to `502 Bad Gateway`; gateway timeout or temporary unavailability MUST map to `503 Service Unavailable` and remain safely retryable.
- 11. Authentication failures MUST retain the application-wide `401 Unauthorized` behavior, and no mapped error may expose gateway internals or sensitive submitted values.
- 12. The status endpoint MUST refresh or reconcile through task 07 and MUST NOT infer bank-account or payout readiness from recipient existence alone.
</requirements>

## Subtasks
- [ ] 08.1 Define a validated bank-account request boundary that excludes caller-selected ownership.
- [ ] 08.2 Expose the two singular `/provider/me/payout` routes with authenticated `PRESTADOR` enforcement.
- [ ] 08.3 Require and propagate idempotency context for the bank-account mutation and reject conflicting key reuse.
- [ ] 08.4 Serialize successful mutation and refresh results using only safe status and masked response contracts.
- [ ] 08.5 Translate validation, authorization, conflict, gateway rejection, bad gateway response, and temporary outage outcomes to the approved HTTP statuses.
- [ ] 08.6 Add regression coverage for ownership, idempotent replay, conflicting retries, masking, status refresh, and every documented error mapping.

## Implementation Details
Follow the TechSpec sections **Core Interfaces**, **API Endpoints**, **Integration Points**, and **Technical Considerations**. Mount these operations on the existing `ProviderController` boundary or a focused controller that retains the singular `provider` prefix. Consume the synchronization service from task 07 and the authenticated identity/role enforcement from task 04; do not duplicate gateway calls or financial persistence in the HTTP layer.

Use the shared task-02 request and safe response types at the API boundary. Idempotency scope must include the authenticated provider and operation so keys cannot collide across providers. The implementation must distinguish deterministic Pagar.me business rejection (`422`) from malformed/unexpected upstream responses (`502`) and transient timeout or unavailability (`503`).

The status endpoint is a read-shaped reconciliation operation: it may refresh safe local gateway state, but it accepts no financial payload or caller-selected identity. Frontend clients and completion-state invalidation are owned by task 13.

### Relevant Files
- `apps/backend/src/modules/provider/provider.controller.ts` — Existing singular provider route boundary where authenticated `/me` payout operations integrate.
- `apps/backend/src/modules/provider/provider.module.ts` — Registers the task-07 synchronization service, payout controller dependencies, and required guards.
- `apps/backend/src/modules/provider/provider-payout.service.ts` — Task-07 domain boundary for bank-account synchronization, status refresh, safe serialization, and idempotency outcomes.
- `libs/shared/src/index.ts` — Exports the task-02 financial request and masked response contracts used by both API and later frontend clients.

### Dependent Files
- `apps/backend/src/modules/provider/dto/provider-payout.dto.ts` — Adds the validated HTTP DTO for bank-account mutation without ownership fields.
- `apps/backend/src/modules/provider/provider.controller.spec.ts` — Covers route delegation, authenticated identity, role enforcement, idempotency propagation, and exception mapping.
- `apps/backend/test/e2e/provider-payout.e2e-spec.ts` — Adds HTTP-level coverage for safe mutations, status refresh, replay behavior, authorization, and gateway error mappings.

### Related ADRs
- [ADR-002: Gateway-Owned Provider Payout Data](adrs/adr-002.md) — Requires gateway-authoritative financial state, idempotent updates, masking, and exclusion of raw payout data.
- [ADR-003: Server-Derived Profile Completion Resource](adrs/adr-003.md) — Keeps payout mutations focused, token-derived, and independently refreshable by the completion resource.

## Deliverables
- Authenticated singular provider endpoints for bank-account mutation and payout-status refresh.
- Validated financial DTOs that cannot select another provider and that integrate with the shared task-02 contracts.
- Required idempotency-key handling with replay-safe responses and conflicting-payload detection.
- Masked response serialization and deterministic `400`, `403`, `409`, `422`, `502`, and `503` mappings.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for idempotent provider payout APIs and gateway error translation **(REQUIRED)**

## Tests
- Unit tests:
  - [ ] A valid bank-account request from authenticated provider `10` invokes task 07 for provider `10`, propagates the idempotency key, and returns only masked bank metadata.
  - [ ] A status request derives provider identity from authentication, invokes reconciliation, and reports readiness false for a recipient-only profile.
  - [ ] Missing, blank, oversized, or malformed idempotency keys return `400` before any synchronization or gateway mutation occurs.
  - [ ] Invalid bank request fields return `400` and do not include submitted financial values in the error body.
  - [ ] An authenticated `CLIENTE` receives `403` from both endpoints and cannot invoke the synchronization service.
  - [ ] Repeating the same provider, operation, key, and payload returns the original safe result without a second gateway mutation.
  - [ ] Reusing a key with a different bank payload returns `409`.
  - [ ] A gateway business rejection maps to `422`, an invalid upstream response maps to `502`, and a timeout or temporary outage maps to `503`.
  - [ ] Every success and error serializer omits raw account, branch, document, credential, and gateway payload fields.
- Integration tests:
  - [ ] `PUT /provider/me/payout/bank-account` with a valid provider token and key returns `200`, persists safe synchronization state, and exposes only masked metadata.
  - [ ] Reusing an idempotency key with a changed payload returns `409` and leaves the previously persisted payout state unchanged.
  - [ ] `GET /provider/me/payout/status` reconciles mocked gateway state and becomes ready only after the bank account is confirmed.
  - [ ] Missing authentication returns `401`, while a valid customer token returns `403`, for bank and status routes.
  - [ ] Invalid DTO input returns `400`, mocked gateway rejection returns `422`, malformed gateway output returns `502`, and mocked timeout or outage returns `503`.
  - [ ] Database, HTTP response, and captured logs contain no complete submitted bank account, branch, gateway credential, or raw response payload.
  - [ ] Supplying ownership-like fields in either mutation cannot select or alter a provider other than the authenticated provider.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Both `/provider/me/payout` endpoints enforce authenticated `PRESTADOR` ownership.
- Identical financial retries are idempotent, while conflicting key reuse returns `409` without repeating gateway mutation.
- Successful responses expose only safe status and approved masked metadata.
- Validation, role, conflict, rejection, bad upstream response, and transient outage conditions map exactly to `400`, `403`, `409`, `422`, `502`, and `503`.
- Status refresh never equates recipient existence with bank-account or aggregate payout readiness.
