# Frontend Rules

- The frontend lives in `apps/frontend` and uses Angular 21, SCSS, Storybook, Cypress, and TypeScript.
- Follow existing Angular conventions before introducing new component, routing, state, or styling patterns.
- When frontend work depends on backend features, respect the backend module structure pattern used by `apps/backend/src/modules/auth`.
- Do not create frontend-only assumptions about backend operations that conflict with the backend CQRS layout:
  - write flows map to backend `commands/<use-case>/`
  - read flows map to backend `queries/<use-case>/`
  - shared request/response contracts should be aligned with backend DTOs and moved to `libs/shared` when reused by both apps
- Keep components focused on presentation and user interaction. Move reusable logic into services or shared utilities.
- Do not put critical business rules only in the frontend; backend validation remains authoritative.
- Use Angular forms, routing, dependency injection, and template patterns idiomatically.
- Keep SCSS consistent with existing files under `apps/frontend/src/app/scss`.
- Avoid broad visual redesigns unless the task asks for them.
- When adding UI, account for loading, empty, error, disabled, and success states when they are relevant to the workflow.
- Prefer contracts from `libs/shared` for data exchanged with the backend.
