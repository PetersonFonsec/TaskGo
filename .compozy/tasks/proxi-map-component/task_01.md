---
status: completed
title: Add Leaflet Dependencies and Stylesheet Configuration
type: frontend
complexity: low
dependencies: []
---

# Task 1: Add Leaflet Dependencies and Stylesheet Configuration

## Overview

This task prepares the Angular frontend to use Leaflet and OpenStreetMap rendering. It adds the required package dependencies and makes Leaflet's stylesheet available to application, test, and Storybook builds.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST add `leaflet` as a runtime dependency in the frontend package.
- MUST add `@types/leaflet` as a frontend dev dependency.
- MUST add `node_modules/leaflet/dist/leaflet.css` to Angular build styles.
- MUST add `node_modules/leaflet/dist/leaflet.css` to Angular test styles.
- SHOULD add Leaflet CSS to Storybook styles so the map renders correctly in component previews.
- MUST keep existing frontend package scripts and Angular build options intact.
</requirements>

## Subtasks

- [x] 1.1 Add the Leaflet runtime package to the frontend dependency manifest.
- [x] 1.2 Add Leaflet TypeScript types to the frontend dev dependency manifest.
- [x] 1.3 Include Leaflet CSS in the Angular application build styles.
- [x] 1.4 Include Leaflet CSS in the Angular unit test styles.
- [x] 1.5 Include Leaflet CSS in Storybook styles where applicable.
- [x] 1.6 Verify dependency and configuration changes do not remove existing settings.

## Implementation Details

Create the dependency/configuration foundation described in the TechSpec "Integration Points" section. This task should not create the map component; it only prepares the frontend build system to consume Leaflet safely. Because the frontend is an npm workspace and dependencies are hoisted to the monorepo root, the Angular style entry uses the package specifier `leaflet/dist/leaflet.css` so the build can resolve it from `apps/frontend`.

### Relevant Files

- `apps/frontend/package.json` — frontend dependency manifest where `leaflet` and `@types/leaflet` must be declared.
- `apps/frontend/angular.json` — Angular build, test, and Storybook stylesheet configuration.
- `.compozy/tasks/proxi-map-component/_techspec.md` — source of dependency and stylesheet requirements.

### Dependent Files

- `apps/frontend/package-lock.json` — should update when dependencies are installed.
- `apps/frontend/src/styles.scss` — global styles remain in place and should not be replaced by Leaflet CSS.

### Related ADRs

- [ADR-002: Shared UI Component with Browser-Only Leaflet Loading](adrs/adr-002.md) — Leaflet is the selected map library and must be prepared for the frontend.

## Deliverables

- Updated frontend package dependency manifest with Leaflet runtime dependency.
- Updated frontend package dependency manifest with Leaflet type dependency.
- Updated Angular stylesheet configuration for build and test targets.
- Storybook stylesheet configuration includes Leaflet CSS if the target accepts global styles.
- Unit tests or configuration validation with 80%+ coverage **(REQUIRED)**
- Integration validation through frontend install/build/test command where feasible **(REQUIRED)**

## Tests

- Unit tests:
  - [x] Verify `apps/frontend/package.json` contains `leaflet` in dependencies.
  - [x] Verify `apps/frontend/package.json` contains `@types/leaflet` in devDependencies.
  - [x] Verify Angular build styles include Leaflet CSS.
  - [x] Verify Angular test styles include Leaflet CSS.
- Integration tests:
  - [x] Run frontend dependency installation or lockfile update command successfully.
  - [x] Run the frontend test or build command far enough to confirm the stylesheet path resolves.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- Leaflet dependencies are declared in the frontend package.
- Leaflet CSS is available to application and test builds.
- Existing Angular styles and build options remain intact.
