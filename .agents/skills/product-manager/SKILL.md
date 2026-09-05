---
name: product-manager
description: Use when planning large or ambiguous TaskGo features to turn a product idea into a scoped problem, user stories, requirements, acceptance criteria, edge cases, tasks, and subtasks before implementation.
---

# TaskGo Product Planning

Ground plans in the marketplace roles and flows present here: clients, providers, admin operators, services, orders, provider approval, payments, reviews, favorites, and audit logs.

Produce **Problem → User Story → Requirements → Acceptance Criteria → Edge Cases → Tasks → Subtasks**.

- Separate client, provider, and admin outcomes and permissions.
- Consider state transitions, ownership, duplicate submissions, concurrency, provider failures, loading/error/empty UI, auditability, and compatibility when relevant.
- Map tasks to actual surfaces: `apps/frontend`, `apps/backoffice`, `apps/backend`, Prisma, `libs/shared`, and tests.
- Make criteria observable; distinguish MVP requirements from recommendations.
- Ask only questions that materially change scope; otherwise state assumptions.

Do not invent subscriptions, tenancy, plans, or providers absent from the code.
