# Backend Rules

## Stack and location

* The backend lives in `apps/backend`.
* The backend uses NestJS, Prisma, Jest, and TypeScript.
* Use the existing module structure under `apps/backend/src/modules`.

## Module structure

Every backend module must follow the same organization used by `apps/backend/src/modules/auth`.

Use this structure:

```txt
apps/backend/src/modules/<module-name>/
├── <module-name>.module.ts
├── <module-name>.controller.ts
├── <module-name>.service.ts
├── commands/
│   └── <use-case>/
│       ├── <use-case>.command.ts
│       ├── <use-case>.dto.ts
│       └── <use-case>.handler.ts
├── queries/
│   └── <use-case>/
│       ├── <use-case>.query.ts
│       ├── <use-case>.dto.ts
│       └── <use-case>.handler.ts
├── events/
├── exceptions/
├── dto/
├── commands/index.ts
└── queries/index.ts
```

Rules:

* Root module files stay at the module root.
* Write operations must go inside `commands/<use-case>/`.
* Read operations must go inside `queries/<use-case>/`.
* Module events must go inside `events/`.
* Module-specific exceptions must go inside `exceptions/`.
* Generic module DTOs must go inside `dto/`.
* Keep barrel files such as `commands/index.ts` and `queries/index.ts` when they match the auth module pattern.
* Do not create new backend folder patterns unless the auth structure cannot represent the use case.

## Controllers

* Controllers must stay thin.
* Controllers are responsible only for:

  * route mapping
  * request validation
  * auth metadata
  * delegating execution to services, commands, or queries
* Do not place business logic inside controllers.
* Do not place token parsing or token validation logic inside controllers.
* Use NestJS Guards to validate authentication and authorization.
* Use the existing `User` decorator to access the authenticated user data, such as the user id.

## Services, commands, and queries

* Services should contain application behavior and coordinate persistence or integrations.
* Commands should represent write use cases.
* Queries should represent read use cases.
* Keep handlers focused on a single use case.
* Avoid mixing read and write responsibilities in the same handler.

## Persistence

* Use `PrismaService` for all database access.
* Do not create ad hoc Prisma clients or database clients.
* When changing persistence models, update all affected files:

  * `apps/backend/src/prisma/schema.prisma`
  * Prisma migrations
  * seeds, if required
  * DTOs
  * interfaces
  * tests

## Database safety

* Be careful with destructive database commands.
* Do not run any of the following unless the user explicitly approves:

  * `prisma migrate reset`
  * `npm run prisma:reset`
  * any script that resets, truncates, or deletes database data

## Exceptions and validation

* Prefer explicit exceptions from `apps/backend/src/shared/exceptions` when matching existing behavior.
* Do not weaken authentication, authorization, validation, or error handling to make tests pass.
* Preserve existing security behavior unless the user explicitly asks for a security-related change.
