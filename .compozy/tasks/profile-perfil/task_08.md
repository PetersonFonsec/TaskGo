---
status: pending
title: "QA: unit, integration, and Cypress tests for profile edit, address management, and verification flows"
type: test
complexity: medium
dependencies:
  - task_05
  - task_06
  - task_07
---

# Task 08: QA: unit, integration, and Cypress tests for profile edit, address management, and verification flows

## Overview
Add and run comprehensive tests covering backend units, frontend components, and end-to-end user flows for profile editing, address management, and verification triggers. Ensure regression-free behavior across profile functionality.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- Provide unit tests for altered backend services and frontend components.
- Provide integration tests for the backend verification and address flows.
- Provide Cypress E2E tests simulating user editing profile, adding addresses, and requesting verification.
</requirements>

## Subtasks
- [ ] 08.1 Backend unit tests for user/address/verification services.
- [ ] 08.2 Frontend unit/component tests for `ProfileView`, `ProfileEdit`, and address components.
- [ ] 08.3 Cypress E2E tests for profile edit + address management + verification trigger.
- [ ] 08.4 Run full test suite and fix/remove flaky tests.

## Implementation Details

### Relevant Files
- `apps/backend/src/modules/user/user.service.spec.ts` — extend tests.
- `apps/backend/src/modules/address/address.service.spec.ts` — extend tests.
- `apps/frontend/src/app/modules/profile/*.spec.ts` — new component specs.
- `apps/frontend/cypress/e2e/profile.cy.ts` — new E2E test file.

### Dependent Files
- Backend and frontend implementations from tasks 02–07.

### Related ADRs
- [ADR-001: Modular phased rollout for Profile screens](../adrs/adr-001.md)

## Deliverables
- Comprehensive test suite covering units, integration and E2E flows with clear failure reports.

## Tests
- Ensure deterministic tests and CI-friendly runs.
- Target end-to-end coverage for critical paths: edit/save/verify/address-management.

## Success Criteria
- All tests pass locally and in CI; flaky tests identified and fixed.
