# Proxi Backoffice Technical Specification

## Executive Summary

The Backoffice will be a new Angular application named `backoffice` inside the existing Nx workspace. It will consume dedicated `/admin/*` endpoints from the existing NestJS API and share the current PostgreSQL database only through that API.

Administrative identities remain separate from marketplace users. JWTs use the existing signing secret but carry administrative claims and pass through a dedicated guard. Provider transitions and their audit records commit atomically.

Primary trade-off: the separate frontend provides deployment and interface isolation without duplicating the API, while the shared JWT secret demands strict token-kind validation and negative authorization tests.

## System Architecture

### Component Overview

| Component | Responsibility |
|---|---|
| `apps/backoffice` | Administrative Angular interface, routing, role-based navigation, provider workflows and audit views |
| `AdminModule` | Root backend boundary for `/admin/*` functionality |
| `AdminAuthModule` | Administrative login, token validation, activation and current-session lookup |
| `AdminUsersModule` | Invitations, activation, deactivation and fixed-role assignment |
| `AdminProvidersModule` | Provider queue, details, lifecycle commands and dashboard metrics |
| `AuditModule` | Transactional audit writes and read-only audit searches |
| PostgreSQL/Prisma | Administrative identities, provider states, decisions and audit records |
| Existing provider modules | Existing provider, service, order and review information |

Flow:

```text
Backoffice Angular
      |
      | Administrative JWT
      v
NestJS /admin/* controllers
      |
AdminAuthGuard -> AdminRolesGuard
      |
Application services
      |
Prisma transaction
      |
Provider state + lifecycle event + audit record
```

## Implementation Design

### Core Interfaces

Primary command boundary, expressed independently of the TypeScript implementation:

```go
type ProviderAdminService interface {
    List(ctx context.Context, query ProviderQuery) (ProviderPage, error)
    Get(ctx context.Context, id int64) (ProviderDetails, error)
    Approve(ctx context.Context, id int64, actor AdminActor) error
    Reject(ctx context.Context, id int64, reason string, actor AdminActor) error
    Block(ctx context.Context, id int64, reason string, actor AdminActor) error
    Unblock(ctx context.Context, id int64, reason string, actor AdminActor) error
}
```

NestJS audit contract:

```typescript
interface AuditEntryInput {
  actorId: bigint;
  actorRole: AdminRole;
  action: AuditAction;
  entityType: string;
  entityId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  reason?: string;
  requestId: string;
}
```

Errors use existing NestJS HTTP exceptions:

- `401` for invalid, expired or non-administrative tokens.
- `403` for inactive operators or insufficient roles.
- `404` for missing administrators or providers.
- `409` for invalid or concurrent state transitions.
- `422` for invalid command reasons.

### Data Models

#### AdminRole

```text
ADMINISTRATOR
SUPPORT
FINANCE
MODERATOR
```

#### AdminUser

| Field | Type | Rules |
|---|---|---|
| `id` | BigInt | Primary key |
| `name` | String | Required |
| `email` | String | Unique, normalized |
| `passwordHash` | String | Nullable until activation |
| `role` | AdminRole | Exactly one fixed role |
| `active` | Boolean | Defaults to false |
| `tokenVersion` | Integer | Incremented on role, password or status changes |
| `invitationTokenHash` | String | Nullable and never returned |
| `invitationExpiresAt` | DateTime | Nullable |
| `activatedAt` | DateTime | Nullable |
| `createdAt` | DateTime | Immutable |
| `updatedAt` | DateTime | Managed timestamp |

Administrative users are never physically deleted through the application.

#### ProviderStatus

```text
PENDING
APPROVED
REJECTED
BLOCKED
```

Add `status` and `statusChangedAt` to `Provider`. Migrate existing verified providers to `APPROVED`; unverified providers become `PENDING`. Keep the current `verified` field temporarily synchronized for compatibility, then remove it in a later migration.

#### ProviderDecision

| Field | Type | Rules |
|---|---|---|
| `id` | BigInt | Primary key |
| `providerId` | BigInt | Indexed relation |
| `action` | Enum | APPROVE, REJECT, BLOCK, UNBLOCK |
| `fromStatus` | ProviderStatus | Required |
| `toStatus` | ProviderStatus | Required |
| `reason` | String | Required except approval |
| `actorAdminId` | BigInt | Restrict deletion |
| `actorRole` | AdminRole | Historical snapshot |
| `createdAt` | DateTime | Immutable |

#### AuditLog

| Field | Type | Rules |
|---|---|---|
| `id` | BigInt | Primary key |
| `actorAdminId` | BigInt | Indexed relation |
| `actorRole` | AdminRole | Historical snapshot |
| `action` | String | Indexed |
| `entityType` | String | Indexed |
| `entityId` | String | Indexed |
| `before` | JSON | Minimal state delta |
| `after` | JSON | Minimal state delta |
| `reason` | String | Nullable |
| `requestId` | String | Indexed correlation identifier |
| `ipAddress` | String | Nullable |
| `userAgent` | String | Nullable |
| `createdAt` | DateTime | Indexed and immutable |

The API exposes no update or delete operation for audit records.

### Permission Matrix

| Capability | Administrator | Support | Finance | Moderator |
|---|---:|---:|---:|---:|
| Administrative users | Manage | No | No | No |
| Provider queue/details | Read | Read | No | No |
| Provider decisions | Execute | No | No | No |
| Provider dashboard | Read | Read | No | No |
| Audit log | Read | No | No | No |

### Administrative JWT

Claims:

```json
{
  "sub": "42",
  "tokenKind": "admin",
  "role": "ADMINISTRATOR",
  "ver": 3
}
```

`AdminAuthGuard` must:

1. Verify the JWT using the current signing secret.
2. Require `tokenKind=admin`.
3. Load `AdminUser` by `sub`.
4. Require `active=true`.
5. Compare `ver` with `tokenVersion`.
6. Attach the current administrator to the request.

`AdminRolesGuard` evaluates route metadata against the current database role rather than trusting the JWT claim alone.

### API Endpoints

#### Authentication

| Method | Path | Access | Result |
|---|---|---|---|
| POST | `/admin/auth/login` | Public | Administrative JWT |
| POST | `/admin/auth/activate` | Invitation token | Activates account and invalidates invitation |
| GET | `/admin/auth/me` | Any active administrator | Current operator |
| POST | `/admin/auth/change-password` | Any active administrator | Increments token version |

#### Administrative Users

| Method | Path | Access | Result |
|---|---|---|---|
| GET | `/admin/users` | Administrator | Paginated operator list |
| POST | `/admin/users/invitations` | Administrator | Creates inactive operator and invitation |
| PATCH | `/admin/users/:id/role` | Administrator | Changes fixed role |
| POST | `/admin/users/:id/activate` | Administrator | Reactivates operator |
| POST | `/admin/users/:id/deactivate` | Administrator | Deactivates operator |

Role and status changes write audit records transactionally. An Administrator cannot deactivate the final active Administrator.

#### Providers

| Method | Path | Access | Result |
|---|---|---|---|
| GET | `/admin/providers` | Administrator, Support | Paginated and filtered provider queue |
| GET | `/admin/providers/:id` | Administrator, Support | Provider review details |
| GET | `/admin/providers/:id/history` | Administrator, Support | Provider decision history |
| POST | `/admin/providers/:id/approve` | Administrator | `PENDING -> APPROVED` |
| POST | `/admin/providers/:id/reject` | Administrator | `PENDING -> REJECTED` |
| POST | `/admin/providers/:id/block` | Administrator | `APPROVED -> BLOCKED` |
| POST | `/admin/providers/:id/unblock` | Administrator | `BLOCKED -> APPROVED` |

Reject, block and unblock accept:

```json
{
  "reason": "Required operational justification"
}
```

Commands use conditional updates against the expected current status. Concurrent or repeated invalid transitions return `409`.

#### Dashboard and Audit

| Method | Path | Access | Result |
|---|---|---|---|
| GET | `/admin/dashboard/providers` | Administrator, Support | Queue counts, decisions and review duration |
| GET | `/admin/audit-logs` | Administrator | Paginated filtered audit entries |
| GET | `/admin/audit-logs/:id` | Administrator | Audit entry details |

List endpoints accept page, limit, status, dates and relevant identifiers. `limit` defaults to 25 and is capped at 100.

## Integration Points

### Existing Proxi API

The Backoffice uses the same NestJS deployment and existing domain records. Administrative controllers must not reuse public controllers.

### Invitation Email

Use the existing mailer infrastructure. Store only the invitation-token hash. Email-delivery failure must preserve the inactive account and permit an Administrator to resend a rotated invitation.

### Pagar.me

No direct integration is added in the MVP. Existing recipient identifiers may appear as restricted provider context only when authorized.

## Impact Analysis

| Component | Impact | Description and Risk | Required Action |
|---|---|---|---|
| Nx workspace | New | Adds a deployable Angular application | Add `apps/backoffice` targets |
| Angular frontend | Unchanged | Public application remains isolated | Extract only proven shared primitives |
| NestJS application | Modified | Adds privileged `/admin` boundary | Register `AdminModule` |
| Authentication | Modified | Adds token-kind-aware administrative flow | Add dedicated guards and negative tests |
| Prisma schema | Modified | Adds identities, states, decisions and audit | Create deterministic migrations |
| Provider module | Modified | Existing `verified` behavior must remain compatible | Synchronize during transition |
| Deployment | Modified | Adds Backoffice frontend artifact | Configure independent host and API origin |
| Observability | Modified | Adds administrative security signals | Add metrics and structured logs |

## Testing Approach

### Unit Tests

- Administrative token claim validation.
- Active status and token-version enforcement.
- Complete role matrix.
- Every valid and invalid provider transition.
- Mandatory reason validation.
- Audit payload minimization.
- Dashboard aggregation.
- Invitation expiry and rotation.
- Final-Administrator protection.

### Integration Tests

Run against PostgreSQL and verify:

- Provider change, decision and audit commit atomically.
- Audit failure rolls back the provider change.
- Conditional updates reject concurrent transitions.
- Deactivation invalidates existing tokens.
- Migrations map existing providers correctly.
- Pagination and indexes support representative datasets.

### E2E Tests

- Ordinary user JWTs receive `401` from `/admin/*`.
- Each administrative role is tested against every endpoint family.
- Administrator invitation, activation, login and deactivation.
- Provider approval, rejection, blocking and unblocking.
- Audit filters return the associated immutable entries.
- Cypress covers login, queue, details, confirmation dialogs and audit search.
- Accessibility assertions cover keyboard navigation, focus and non-color status cues.

### Performance Tests

Use a documented dataset, concurrency level, warm-up and duration. Provider and audit list endpoints must remain below 500 ms at p95. Record query count and database duration separately.

## Development Sequencing

### Build Order

1. Add Prisma enums, administrative identities, provider status, decisions and audit models — no dependencies.
2. Add migrations and compatibility mapping for `verified` — depends on step 1.
3. Implement administrative authentication and guards — depends on steps 1–2.
4. Implement operator invitations and lifecycle — depends on step 3.
5. Implement transactional audit service — depends on steps 1–3.
6. Implement provider queries and explicit commands — depends on steps 2, 3 and 5.
7. Implement provider dashboard and audit queries — depends on steps 5–6.
8. Generate the Angular Backoffice application and authentication shell — depends on step 3.
9. Implement operator, provider, dashboard and audit screens — depends on steps 4, 6, 7 and 8.
10. Add integration, E2E, Cypress and performance suites — depends on steps 1–9.
11. Configure independent Backoffice deployment and observability — depends on steps 8–10.

### Technical Dependencies

- Administrative JWT claim contract.
- Backoffice frontend origin and API CORS configuration.
- Email invitation URL and delivery configuration.
- Initial Administrator bootstrap procedure.
- Agreed load profile for the 500 ms p95 target.
- Product definitions for required provider evidence and audit retention.

## Monitoring and Observability

Track:

- Administrative login successes and failures.
- Rejected ordinary tokens on administrative routes.
- Authorization denials by role and endpoint.
- Provider decisions by action and result.
- Transaction rollbacks and conflicts.
- Audit-write failures.
- Provider queue age and review duration.
- Endpoint p50, p95 and p99 latency.
- Database query duration for provider and audit lists.

Structured logs include `requestId`, `adminId`, `role`, `action`, `entityType`, `entityId`, outcome and latency. They must not include passwords, tokens, invitation secrets or complete personal records.

Alert on any audit-write failure, repeated administrative authentication failures, elevated `5xx` responses or p95 latency above 500 ms for three consecutive measurement windows.

## Technical Considerations

### Key Decisions

- Separate Angular Backoffice with a shared NestJS API.
- Dedicated administrative identities.
- Shared JWT secret with strict token-kind and database validation.
- Explicit transition endpoints.
- Atomic provider decisions and audit writes.
- Comprehensive verification and performance gate.

### Known Risks

- Shared JWT secret increases compromise scope; mitigate through token-kind checks, token versions and negative E2E coverage.
- Current backend `RolesGuard` allows all requests; administrative endpoints must use new deny-by-default guards.
- Existing `verified` behavior may conflict with richer statuses; use a compatibility migration and explicit removal plan.
- Audit JSON may collect excessive personal data; permit only minimal state deltas.
- Large audit tables may degrade queries; use bounded pagination and indexes matching supported filters.
- A separate frontend adds deployment overhead; keep it in the Nx workspace and share only stable tooling.

## Architecture Decision Records

- [ADR-001: Deliver the Backoffice Through Complete Operational Verticals](adrs/adr-001.md) — Releases each domain as a complete governed workflow.
- [ADR-002: Separate Backoffice Frontend With Shared API](adrs/adr-002.md) — Isolates the Angular administrative surface while retaining one NestJS API.
- [ADR-003: Dedicated Administrative Identities With Shared JWT Secret](adrs/adr-003.md) — Separates operators from marketplace users and distinguishes administrative tokens through validated claims.
- [ADR-004: Explicit Provider Commands With Transactional Audit](adrs/adr-004.md) — Makes provider transitions intentional and atomically auditable.
- [ADR-005: Comprehensive Backoffice Verification Gate](adrs/adr-005.md) — Requires functional, authorization, accessibility and performance evidence.
