---
name: prisma-postgres
description: Use when changing, querying, migrating, debugging, or reviewing TaskGo's Prisma 5 and PostgreSQL persistence layer.
---

# TaskGo Prisma/PostgreSQL

Schema and migrations are in `apps/backend/src/prisma`; PostgreSQL 17 is the configured database. Inject `PrismaService`; no repository abstraction is established. IDs are `BigInt`, money is `Decimal`, provider payloads/snapshots use JSON, and database names often use `@map`/`@@map`.

- Inspect schema, migration history, call sites, and production-data implications before editing.
- Use explicit `select`/`include`; avoid exposing Prisma records as public contracts. Fetch only needed relations and check list queries for N+1.
- Encode integrity with required relations, `onDelete`, unique/compound constraints, defaults, enums, and indexes backed by actual queries.
- Use `$transaction` for atomic multi-write use cases; every operation inside must use `tx`. Design retry/webhook paths for idempotency and unique-race handling.
- Create forward-only, reviewable migrations with backfill/expand-contract strategy when compatibility requires it. Review SQL before execution.

Never run reset or destructive migrations automatically. E2E scripts reset a dedicated test database: confirm `DATABASE_URL` targets `taskgo_test` before invoking them.
