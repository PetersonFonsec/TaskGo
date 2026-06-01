---
status: pending
title: "QA: Unit, integration and E2E tests"
type: test
complexity: medium
dependencies:
  - task_03
  - task_05
  - task_06
  - task_07
---

# Task 08: QA: Unit, integration and E2E tests

## Overview
Cover the favorites feature with backend and frontend tests across unit, integration, and end-to-end flows so the MVP is reliable and regressions are prevented.

+<critical>
+- ALWAYS READ the PRD and TechSpec before starting
+- REFERENCE TECHSPEC for implementation details — do not duplicate here
+- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
+- MINIMIZE CODE — show code only to illustrate current structure or problem areas
+- TESTS REQUIRED — every task MUST include tests in deliverables
+</critical>
+
+<requirements>
+- Must add or extend tests to cover favorite add/remove/list flows in backend and frontend.
+- Must include at least one end-to-end test for search filter and Favorites page.
+- Tests must validate both success and failure modes.
+</requirements>
+
+## Subtasks
+- [ ] 08.1 Add backend tests for favorites endpoints and search filter.
+- [ ] 08.2 Add frontend tests for favorite toggle state and Favorites page.
+- [ ] 08.3 Add E2E scenario for favorite lifecycle.
+
+## Implementation Details
+Extend existing backend and frontend test suites with focused coverage for the new favorites feature.
+
+### Relevant Files
+- `apps/backend/src/modules/provider/provider.controller.spec.ts`
+- `apps/frontend/src/app/modules/customer/search/search.spec.ts` (or equivalent)
+  
+### Dependent Files
+- New backend and frontend favorites code from tasks 03, 05, 06, 07.
+
+### Related ADRs
+- [ADR-001](../favoritar-profissionais/adrs/adr-001.md)
+
+## Deliverables
+- Expanded test coverage for favorites flows.
+- End-to-end scenario that adds a favorite, views it in Favorites, and filters search.
+
+## Tests
+- Unit tests:
+  - [ ] Backend endpoints succeed for add/remove/list.
+  - [ ] Frontend toggle reflects API responses correctly.
+  - [ ] Persistence behavior for the search filter.
+- Integration tests:
+  - [ ] Search filter returns only favorites.
+  - [ ] Favorites page loads saved providers.
+- Test coverage target: >=80% for new code.
+
+## Success Criteria
+- All new tests pass.
+- New favorites code coverage meets threshold.
