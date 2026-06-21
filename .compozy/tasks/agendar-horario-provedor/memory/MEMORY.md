# Workflow Memory

Keep only durable, cross-task context here. Do not duplicate facts that are obvious from the repository, PRD documents, or git history.

## Current State

## Shared Decisions

## Shared Learnings
- Backend focused provider tests now rely on `@taskgo/backend/shared/*` being mapped in `apps/backend/package.json`; this mirrors the existing tsconfig path and may help future backend tests that import provider/favorites code.
- As of Task 1 verification, the full backend Jest suite has unrelated pre-existing failures in older auth/favorites imports and missing PrismaService providers in several controller/service specs. Focus future task validation on touched suites unless those harness issues are intentionally fixed.
- Provider availability slots are generated in `America/Sao_Paulo` local time and returned as ISO UTC timestamps; frontend display and future order validation should compare exact ISO instants while showing local labels/timezone.
- Backend ESLint is currently blocked by `apps/backend/eslint.config.mjs` importing the missing `typescript-eslint` package; touched-file lint cannot run until that package/config mismatch is fixed.
- Frontend Karma tests currently compile unrelated specs even when `--include` targets one file; the suite is blocked by existing Jest-in-Jasmine specs, stale component/directive/guard/category specs, and an unresolved `@angular/compiler` bundle error before touched frontend specs can run.
- The frontend test runner resolves `@angular/compiler` from root `node_modules`, where it is missing, while the package exists under `apps/frontend/node_modules`; even a temporary one-spec tsconfig reaches this runtime resolver failure.
- Frontend development builds currently emit repeated `NG0408` warnings because both `provideZoneChangeDetection` and `provideZonelessChangeDetection` are configured, but the build still exits 0.
- Cypress config currently references the missing `mochawesome` reporter; use `--reporter spec` for local `cypress run` verification unless the reporter dependency is installed.
- Guarded/dynamic customer routes can SSR-redirect during Cypress direct visits before localStorage auth is available; seed localStorage on the app origin and use client-side history navigation for routes such as `/customer/:id`.

## Open Risks

## Handoffs
