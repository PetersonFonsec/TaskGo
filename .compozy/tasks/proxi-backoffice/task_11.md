---
status: completed
title: Implement Backoffice authentication, session, and shell
type: frontend
complexity: high
dependencies:
    - task_02
    - task_03
    - task_10
---

# Task 11: Implement Backoffice authentication, session, and shell

## Overview
Implement the administrative login, session lifecycle, protected shell, and fixed-role navigation in the new Angular application. The client must handle authentication ergonomics while treating backend authorization as authoritative.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
1. MUST authenticate only through /admin/auth and use the Backoffice-specific storage key.
2. MUST attach the token only to configured Proxi API requests.
3. MUST clear the session and return to login on 401 or inactive/stale-token responses.
4. MUST show navigation only for the current fixed role while relying on API enforcement.
5. MUST provide keyboard-accessible login, navigation, focus, loading, and error states.
</requirements>

## Subtasks
- [ ] 11.1 Implement administrative login and session services.
- [ ] 11.2 Implement the API token interceptor and session-expiry handling.
- [ ] 11.3 Implement protected and anonymous route guards.
- [ ] 11.4 Build the accessible administrative shell and fixed-role navigation.
- [ ] 11.5 Add login, logout, expiry, and role-navigation tests.

## Implementation Details
See TechSpec "Administrative JWT" and "Permission Matrix". Adapt patterns rather than importing public application session services.

### Relevant Files
- `apps/frontend/src/app/modules/auth/services/login/login.ts` — current HttpClient login pattern.
- `apps/frontend/src/app/shared/service/token/token.service.ts` — SSR-safe storage handling.
- `apps/frontend/src/app/shared/interceptors/token/token.interceptor.ts` — token interceptor precedent.

### Dependent Files
- `apps/frontend/src/app/app.config.ts` — interceptor registration pattern.
- `apps/frontend/src/app/app.routes.ts` — route-guard conventions.

### Related ADRs
- [ADR-002: Separate Backoffice Frontend With Shared API](adrs/adr-002.md)
- [ADR-003: Dedicated Administrative Identities With Shared JWT Secret](adrs/adr-003.md)

## Deliverables
- Login page, session store, interceptor, guards, and shell.
- Role-specific, accessible navigation and error states.
- Cypress administrative authentication journey.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for session and routing **(REQUIRED)**

## Tests
- Unit tests:
  - [ ] Successful login stores only the administrative token and identity.
  - [ ] 401 clears session and redirects once without a navigation loop.
  - [ ] Each role sees only its declared navigation items.
- Integration tests:
  - [ ] Ordinary marketplace token cannot establish a Backoffice session.
  - [ ] Protected route redirects anonymous visitor to login and returns after login.
  - [ ] Keyboard focus moves to validation and API errors.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Expired or deactivated sessions lose access immediately after API rejection.
- Navigation matches the TechSpec permission matrix for all four roles.

