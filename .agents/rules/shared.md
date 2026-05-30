# Shared Library Rules

- Use `libs/shared` for contracts and utilities that are safe for both frontend and backend.
- Good candidates for `libs/shared`:
  - DTO-like interfaces
  - enums
  - request/response contracts
  - validation-independent constants
  - pure utility functions
- Do not move NestJS providers, Angular components, Prisma models, controllers, services, or environment-specific code into `libs/shared`.
- Shared exports should be stable, explicit, and low-dependency.
- Treat changes in `libs/shared` as cross-application changes. Check both frontend and backend usage before modifying shared contracts.
