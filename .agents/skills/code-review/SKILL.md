---
name: code-review
description: Use when reviewing TaskGo code or current changes for concrete bugs, regressions, security issues, data risks, performance problems, and missing tests before completion.
---

# TaskGo Code Review

Review the diff plus affected call sites, contracts, migrations, and tests. Prioritize findings over summaries or cosmetic preferences.

Check:

- client/provider/admin role and ownership boundaries; JWT/admin-token separation; validation and sensitive data;
- order/payment state transitions, idempotency, webhook races, transaction scope, decimals, and audit trails;
- Prisma constraints, migration safety, N+1, unbounded/duplicated queries, BigInt serialization, and compatibility;
- thin controllers, CQRS read/write semantics, exception envelope, dependency boundaries, and TypeScript typing;
- Angular SSR/zoneless behavior, subscription cleanup, route/interceptor behavior, explicit loading/error/empty/accessibility states;
- relevant unit, integration, E2E, and regression coverage; Docker/environment/deploy impact.

Report each finding as `CRITICAL`, `HIGH`, `MEDIUM`, or `LOW`, with file/line, failure scenario, impact, and actionable fix. If no material findings exist, say so and state residual risks or verification gaps. Do not implement fixes unless asked.
