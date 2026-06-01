---
status: pending
title: "Frontend: integrate phone/email verification status and save flow feedback"
type: frontend
complexity: medium
dependencies:
  - task_04
  - task_05
---

# Task 07: Frontend: integrate phone/email verification status and save flow feedback

## Overview
Surface verification status for email and phone in the Profile UI and implement the UX for requesting verification after the user updates those fields. Show pending verification state and disallow actions that require a verified contact (where applicable).

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- Profile UI MUST display verification status for `email` and `phone` (verified, unverified, pending).
- After editing an email or phone, frontend MUST call verification endpoints to trigger verification.
- Verification UI MUST not display or log verification tokens.
</requirements>

## Subtasks
- [ ] 07.1 Add verification status indicators to `ProfileView`.
- [ ] 07.2 Add request-verification action to `ProfileEdit` when email/phone changes.
- [ ] 07.3 Add tests for UI states (verified/pending/unverified) and trigger actions.

## Implementation Details

### Relevant Files
- `apps/frontend/src/app/modules/profile` — update `ProfileView` and `ProfileEdit` components.
- `apps/frontend/cypress/e2e/` — extend profile e2e tests to include verification trigger.

### Dependent Files
- Backend verification endpoints (task_04) must be available for integration tests.

### Related ADRs
- [ADR-001: Modular phased rollout for Profile screens](../adrs/adr-001.md)

## Deliverables
- UI updates showing verification status and a trigger for verification requests.
- Unit tests and Cypress integration for verification flows.

## Tests
- Unit tests:
  - [ ] status indicator renders the correct state based on API response.
  - [ ] clicking request-verification calls the expected endpoint.
- E2E tests:
  - [ ] edit email -> request verification -> observe pending state in UI (mocked flow).

## Success Criteria
- Verification UI implemented and tested; no tokens shown in UI or logs; triggers call backend endpoints.
