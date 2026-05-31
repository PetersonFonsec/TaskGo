---
status: pending
title: Harden authenticated identity foundation
type: backend
complexity: high
dependencies: []
---

# Task 01: Harden authenticated identity foundation

## Overview

Establish a reliable authenticated identity foundation for protected backend journeys. The backend currently validates tokens only inside an unused guard and has no consistent route-level protection, so downstream ownership checks cannot trust the current requester.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- 1. Protected backend journeys MUST reject requests without a valid authenticated session.
- 2. The authenticated user identity MUST be available to downstream controllers and services without trusting client-provided user identifiers.
- 3. Public authentication journeys, including login and registration, MUST remain reachable without an existing session.
- 4. Invalid, malformed, and expired tokens MUST fail with a consistent access-denied response.
- 5. The implementation MUST preserve the public discovery journeys defined in the PRD.
- 6. Because `_techspec.md` is missing, the exact shared authorization mechanism MUST be decided during implementation and documented for the future TechSpec.
</requirements>

## Subtasks

- [ ] 01.1 Define the protected and public route boundary required by the critical marketplace journey.
- [ ] 01.2 Make authenticated identity available to protected controllers and services.
- [ ] 01.3 Ensure missing, malformed, invalid, and expired credentials are rejected consistently.
- [ ] 01.4 Preserve anonymous access to login, registration, and public marketplace discovery.
- [ ] 01.5 Add focused tests for token acceptance, rejection, and authenticated identity propagation.

## Implementation Details

The current `AuthGuard` is not applied by any production controller, and the existing user decorator decodes request headers independently. Align these integration points so protected routes can rely on one verified requester identity. `_techspec.md` is not available, so choose the narrowest implementation consistent with existing NestJS module conventions and record any shared policy decisions.

### Relevant Files

- `apps/backend/src/modules/auth/auth.guard.ts` — Existing token guard that validates and attaches decoded token data.
- `apps/backend/src/modules/auth/auth-token.service.ts` — Token creation, verification, and decode behavior.
- `apps/backend/src/modules/auth/auth.module.ts` — Auth providers and exports.
- `apps/backend/src/shared/decorators/user.decorator.ts` — Current request identity extraction path.
- `apps/backend/src/app.module.ts` — Application-level registration point if a shared protection boundary is selected.

### Dependent Files

- `apps/backend/src/modules/order/order.controller.ts` — Will consume authenticated identity in later order tasks.
- `apps/backend/src/modules/address/address.controller.ts` — Will consume authenticated identity in the address ownership task.
- `apps/backend/src/modules/user/user.controller.ts` — Private account operations require the shared protection boundary.
- `apps/backend/src/modules/provider/provider.controller.ts` — Public discovery and private provider operations need explicit classification.
- `apps/backend/test/e2e/auth.e2e-spec.ts` — Existing HTTP auth flow coverage should be updated or extended.

### Related ADRs

- [ADR-001: Protect the Complete Critical Marketplace Journey](adrs/adr-001.md) — Requires authenticated sessions for private workflows while preserving public discovery.

## Deliverables

- Reliable authenticated requester identity for protected backend journeys.
- Explicit public/private boundary for critical routes.
- Consistent rejection behavior for invalid credentials.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for authenticated and anonymous route access **(REQUIRED)**

## Tests

- Unit tests:
  - [ ] A valid bearer token is accepted and exposes the authenticated user ID to downstream code.
  - [ ] A request without an authorization header is rejected.
  - [ ] A malformed authorization header is rejected.
  - [ ] An invalid or expired token is rejected.
  - [ ] Identity extraction returns the verified requester identity rather than decoding an unverified client value.
- Integration tests:
  - [ ] `POST /auth/login` remains reachable without a bearer token.
  - [ ] `POST /auth/register` remains reachable without a bearer token.
  - [ ] A representative protected route rejects an anonymous request.
  - [ ] Public category, active-service, and provider-discovery routes remain reachable anonymously.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- Protected backend journeys can consistently identify the authenticated requester.
- Anonymous and invalid-token requests cannot reach representative private operations.
- Public discovery and authentication entry points remain accessible without login.
