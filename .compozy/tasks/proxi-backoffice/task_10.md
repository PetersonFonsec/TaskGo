---
status: completed
title: Create the independent Angular Backoffice application
type: frontend
complexity: high
dependencies: []
---

# Task 10: Create the independent Angular Backoffice application

## Overview
Add a separately buildable Angular Backoffice application to the existing Nx workspace. The scaffold must establish strict compilation, testing, environment configuration, and independent output without coupling administrative routes to the public frontend.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
1. MUST create `apps/backoffice` as an Nx Angular application with independent serve, build, test, and E2E targets.
2. MUST use strict TypeScript and Angular template checking consistent with the current frontend.
3. MUST define independent API URL and token-storage environment keys.
4. MUST contain no customer or provider routes, services, or marketplace session state.
5. SHOULD reuse workspace dependencies without extracting speculative shared libraries.
</requirements>

## Subtasks
- [ ] 10.1 Add the Backoffice Nx and Angular project configuration.
- [ ] 10.2 Add bootstrap, routing, environments, and global styling entry points.
- [ ] 10.3 Add unit and Cypress test configuration.
- [ ] 10.4 Register root workspace scripts or targets for local use.
- [ ] 10.5 Verify independent build and test execution.

## Implementation Details
Follow TechSpec "System Architecture" and ADR-002. Mirror only current Angular configuration that is required by the administrative application.

### Relevant Files
- `apps/frontend/project.json` — Nx target convention.
- `apps/frontend/angular.json` — Angular builder and budget configuration.
- `apps/frontend/tsconfig.json` — strict compiler settings.

### Dependent Files
- `nx.json` — target defaults and project discovery.
- `package.json` — workspace scripts and package ownership.

### Related ADRs
- [ADR-002: Separate Backoffice Frontend With Shared API](adrs/adr-002.md)

## Deliverables
- Independently buildable and testable Backoffice Angular project.
- Environment and route foundations with no public-app coupling.
- Initial smoke component and E2E harness.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for application bootstrap and routing **(REQUIRED)**

## Tests
- Unit tests:
  - [ ] Root application bootstraps with production and development environments.
  - [ ] Unknown route resolves to the Backoffice not-found state.
- Integration tests:
  - [ ] `nx build backoffice` produces only the Backoffice artifact.
  - [ ] `nx test backoffice` runs without starting the public frontend.
  - [ ] Cypress smoke test loads the Backoffice root independently.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Backoffice builds and serves as an independent Nx project.
- No administrative route is added to `apps/frontend`.
