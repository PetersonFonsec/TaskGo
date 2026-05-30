# Monorepo Rules

- Use the narrowest project boundary that fits the change.
- Do not duplicate shared types, DTOs, enums, constants, or API contracts across apps.
- Put frontend/backend-neutral shared code in `libs/shared`.
- `apps/backend` must not depend on `apps/frontend`.
- `apps/frontend` must not import backend internals from `apps/backend/src`.
- `libs/shared` must stay independent from Angular, NestJS, Prisma, browser-only APIs, and Node-only APIs unless a task explicitly changes that boundary.
- Prefer explicit project-level commands through Nx instead of running unrelated workspace-wide commands.
- Do not introduce new packages, workspace tools, or build systems unless the task requires it and the tradeoff is clear.
