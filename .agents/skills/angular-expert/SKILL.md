---
name: angular-expert
description: Use when implementing, debugging, testing, or reviewing Angular functionality in TaskGo's customer/provider frontend or administrative backoffice.
---

# TaskGo Angular

TaskGo has Angular 21 standalone, zoneless apps. `apps/frontend` uses SSR/hydration and `modules/` plus `shared/`; `apps/backoffice` uses `features/`, `core/`, and `layout/`. Both use SCSS, functional providers/guards/interceptors, `inject()`, signals, RxJS, lazy routes, and colocated Jasmine/Karma specs. Cypress covers critical E2E flows; the public app also has Storybook.

- Extend the target app's local structure; do not impose the other app's layout.
- Keep UI classes focused on presentation/orchestration; place HTTP in typed injectable services and reuse existing shared UI.
- Prefer signals/computed state and explicit loading, error, submitting/conflict, empty, and accessible announcement states. Clean subscriptions with established lifecycle utilities.
- Preserve guards, role distinctions, token interceptors, SSR/browser boundaries, hydration, accessibility, and responsive SCSS.
- Use existing environment providers/files; never embed secrets or mix public/admin sessions.

Verify the narrow app's test/build and relevant Cypress target. No Angular lint target is configured.
