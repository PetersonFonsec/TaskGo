---
status: completed
title: "Frontend: favorite toggle on cards and profile"
type: frontend
complexity: medium
dependencies:
  - task_03
  - task_04
---

# Task 05: Frontend: favorite toggle on cards and profile

## Overview
Add a favorite (heart) toggle to provider cards (`app-card-detail`) and provider profile headers so clients can add/remove favorites directly from the UI.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- Favorite control must be keyboard-accessible and announce state changes to screen readers.
- Tapping the control must invoke the favorites API and update UI state optimistically.
- Control should show loading/error states and be hidden if feature flag disabled.
</requirements>

## Subtasks
- [x] 05.1 Add heart toggle UI to `app-card-detail` and provider profile header.
- [x] 05.2 Integrate with favorites API to add/remove favorites.
- [x] 05.3 Add unit tests and component tests for accessibility and state transitions.

## Implementation Details
Modify `app-card-detail` component template and provider profile components to include the toggle. Use shared provider service to call backend endpoints.

### Relevant Files
- `apps/frontend/src/app/shared/components/ui/card-detail/card-detail.ts` and `.html` — add toggle to card UI.
- `apps/frontend/src/app/modules/customer/search/search.html` — cards are rendered here; ensure toggle works in list context.
- `apps/frontend/src/app/shared/service/provider/provider.ts` and `provider.model.ts` — add client-side methods to call favorites endpoints.

### Dependent Files
- `apps/frontend/src/app/modules/providers/provider.ts` — provider profile view where header control will be added.

### Related ADRs
- [ADR-001](../favoritar-profissionais/adrs/adr-001.md)

## Deliverables
- Updated UI components with favorite toggle.
- API integration and error/loading handling.
- Component unit tests and accessibility checks.

## Tests
- Unit tests:
  - [ ] Toggle renders with correct initial state when provider is favorited.
  - [ ] Clicking toggles state and calls correct API methods (add/remove).
  - [ ] Keyboard activation and ARIA attributes present.
- Integration tests:
  - [ ] Favorite from card adds provider to Favorites view (end-to-end UI test).

## Success Criteria
- UI toggle works reliably (no visual regressions), accessible, and integration tests pass.
