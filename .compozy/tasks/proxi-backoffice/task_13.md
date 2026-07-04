---
status: completed
title: Implement operator administration UI
type: frontend
complexity: high
dependencies:
    - task_05
    - task_11
---

# Task 13: Implement operator administration UI

## Overview
Add Administrator-only screens for listing, inviting, activating, deactivating, and changing the fixed role of Backoffice operators. The interface must surface security consequences and prevent misleading actions such as disabling the final Administrator.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
1. MUST expose operator administration only to Administrator.
2. MUST support bounded listing, invitation, role change, activation, deactivation, and invitation resend.
3. MUST render exactly the four fixed roles with no individual permission editor.
4. MUST confirm status and role changes and communicate immediate session invalidation.
5. MUST handle final-Administrator and stale-state conflicts without optimistic corruption.
</requirements>

## Subtasks
- [ ] 13.1 Implement operator API client and typed models.
- [ ] 13.2 Build paginated operator list and status display.
- [ ] 13.3 Build invitation and resend workflow.
- [ ] 13.4 Build role and active-state controls with confirmations.
- [ ] 13.5 Add authorization, validation, accessibility, and Cypress coverage.

## Implementation Details
See TechSpec "Administrative Users" and "Permission Matrix". Do not introduce custom permission controls.

### Relevant Files
- `apps/frontend/src/app/modules/auth/register/register.ts` — form workflow precedent.
- `apps/frontend/src/app/shared/components/forms/input-radio/input-radio.component.ts` — fixed-choice control.
- `apps/frontend/src/app/shared/components/ui/full-modal/full-modal.ts` — confirmation dialog.

### Dependent Files
- `apps/frontend/src/app/shared/components/functional/notification/notification.service.ts` — outcome feedback.
- `apps/frontend/src/app/shared/components/forms/input-text/input-text.component.ts` — invitation fields.

### Related ADRs
- [ADR-003: Dedicated Administrative Identities With Shared JWT Secret](adrs/adr-003.md)
- [ADR-005: Comprehensive Backoffice Verification Gate](adrs/adr-005.md)

## Deliverables
- Operator list, invitation, role, activation, and deactivation screens.
- Fixed-role and security-conflict UX.
- Administrator-only route and action coverage.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for operator lifecycle UI **(REQUIRED)**

## Tests
- Unit tests:
  - [ ] Role selector contains exactly Administrator, Support, Finance, and Moderator.
  - [ ] Non-Administrator navigation cannot expose operator administration.
  - [ ] Final-Administrator conflict preserves current UI state.
- Integration tests:
  - [ ] Administrator invites and activates a Support operator.
  - [ ] Role change invalidates the target operator's old session.
  - [ ] Deactivation confirmation identifies the affected operator and consequence.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Administrator can complete every operator lifecycle action from the UI.
- No custom permission or multi-role control exists.

