---
status: completed
title: Implement audit search and detail UI
type: frontend
complexity: medium
dependencies:
    - task_09
    - task_11
---

# Task 15: Implement audit search and detail UI

## Overview
Give Administrators a searchable, paginated audit investigation interface with a focused event-detail view. The UI must preserve immutable semantics, expose useful state deltas, and avoid rendering secrets or unnecessary personal data.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
1. MUST support operator, action, entity, identifier, and date filters with bounded paging.
2. MUST show actor and role snapshots, target, reason, state delta, request ID, and timestamp.
3. MUST remain Administrator-only with no update or delete interaction.
4. MUST preserve filters and page state when opening and closing details.
5. MUST render structured state safely without interpreting HTML or secret fields.
</requirements>

## Subtasks
- [ ] 15.1 Implement audit API client and typed models.
- [ ] 15.2 Build paginated filterable audit list.
- [ ] 15.3 Build safe audit event detail view.
- [ ] 15.4 Preserve investigation navigation state.
- [ ] 15.5 Add authorization, privacy, accessibility, and Cypress coverage.

## Implementation Details
See PRD "Audit log" and TechSpec "Dashboard and Audit". Keep the interface strictly read-only.

### Relevant Files
- `apps/frontend/src/app/modules/general/profile/history/history.ts` — history-list precedent.
- `apps/frontend/src/app/shared/components/forms/filters/filters.ts` — filter UX concepts.
- `apps/frontend/src/app/shared/components/ui/full-modal/full-modal.ts` — optional detail presentation pattern.

### Dependent Files
- `apps/backoffice/src/app/app.routes.ts` — Administrator-only audit route.
- `apps/backoffice/src/app/` — shell navigation created by task_11.

### Related ADRs
- [ADR-004: Explicit Provider Commands With Transactional Audit](adrs/adr-004.md)
- [ADR-005: Comprehensive Backoffice Verification Gate](adrs/adr-005.md)

## Deliverables
- Audit list, filters, paging, and safe detail interface.
- Immutable Administrator-only user journey.
- Investigation state and accessibility coverage.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for audit investigation UI **(REQUIRED)**

## Tests
- Unit tests:
  - [ ] Combined filters serialize exactly to supported API parameters.
  - [ ] Detail rendering escapes markup and omits forbidden fields.
  - [ ] Returning from detail restores filters and page.
- Integration tests:
  - [ ] Administrator locates a seeded event by operator, action, target, and date.
  - [ ] Support, Finance, and Moderator cannot access the audit route.
  - [ ] No edit or delete control exists in list or detail views.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- A known event can be found and inspected within the PRD's two-minute target.
- The UI exposes no mutation path for audit records.

