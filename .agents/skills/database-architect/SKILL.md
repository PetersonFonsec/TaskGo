---
name: database-architect
description: Use when modeling or reviewing TaskGo entities, relations, constraints, indexes, data integrity, query performance, or safe PostgreSQL schema evolution.
---

# TaskGo Database Architecture

Use `apps/backend/src/prisma/schema.prisma` and ordered migrations as truth. The schema uses mapped Portuguese database names, Prisma models/enums, `BigInt` IDs, `Decimal` values, JSON snapshots/provider payloads, timestamps, explicit relations, compound uniqueness, and targeted indexes.

1. Derive invariants from domain flows and real queries.
2. Specify nullability, defaults, uniqueness, foreign-key deletion, state enums, and access-path indexes.
3. Preserve JSON-safe string IDs and decimal/money semantics at API boundaries.
4. Assess existing data, backfill, locks, compatibility window, rollback, and deploy order.
5. Use transactions for multi-write invariants and address races/idempotency in orders, payments, favorites, decisions, and audit logs.

Never execute destructive migrations automatically. Coordinate implementation mechanics with `$prisma-postgres`.
