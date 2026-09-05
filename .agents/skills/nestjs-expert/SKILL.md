---
name: nestjs-expert
description: Use when implementing, modifying, debugging, testing, or reviewing TaskGo NestJS APIs, modules, controllers, use cases, DTOs, guards, validation, or dependency injection.
---

# TaskGo NestJS

The NestJS 11 API is in `apps/backend`. Feature modules live under `src/modules`; `src/shared` contains cross-cutting guards, pipes, filters, contracts, and utilities. Follow `docs/refactoring/backend-architecture-conventions.md`.

- Keep controllers to routing/metadata, validated input, guarded identity, delegation, and response. Never parse JWTs, build Prisma filters, or enforce resource ownership there.
- For substantial new writes use `commands/<use-case>` and `CommandBus`; for reads use `queries/<use-case>` and `QueryBus`. A handler owns one use case. Preserve simpler services where extraction has no concrete value.
- DTOs use `class-validator`/`class-transformer`; the global pipe transforms, whitelists, and forbids extra fields. Use `ParseBigIntPipe` for numeric route IDs.
- Access Prisma only through injected `PrismaService`; keep all writes in a use-case transaction on the transaction client.
- Use Nest/`CustomException` errors; the global filter produces the correlated error envelope. Public responses need explicit contracts; IDs become JSON-safe strings.
- Apply `@Public`, optional auth, customer roles, admin guards/permissions, and resource authorization deliberately.

Add handler unit tests for rules and E2E tests for HTTP, guards, and real transactions. Preserve existing contracts during refactors.
