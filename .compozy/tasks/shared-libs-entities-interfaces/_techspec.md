# Technical Specification: Shared Domain Contracts for Authentication and Profile

## Executive Summary

Implement a focused shared contract surface in `libs/shared` for TaskGo authentication and profile flows. The MVP will use pure JSON-serializable TypeScript types for login/session/me, public profile, registration payloads, and profile update payloads. NestJS DTO classes stay backend-local and map to or implement shared contract types where useful.

The primary trade-off is direct replacement over incremental compatibility. This removes duplicated public models faster, but requires coordinated updates across backend, customer frontend, and backoffice in one implementation slice.

## System Architecture

### Component Overview

- `libs/shared/src/auth-profile`: New shared public contract module for auth/profile types.
- `libs/shared/src/index.ts`: Public barrel export for shared contracts.
- Backend auth/user/admin auth modules: Keep validation DTOs and map endpoint responses to shared serialized contracts.
- Customer frontend auth/profile services: Replace local public auth/profile model imports with shared contracts.
- Backoffice auth/session services: Replace admin auth/session model contracts with shared contracts.
- App-specific view models: Remain local only when a screen needs presentation-only data outside the shared public contract.

Data flow:
1. Backend validates input with Nest DTO classes.
2. Backend maps internal Prisma/entity data into shared serialized response contracts.
3. Frontend and backoffice consume shared request/response/session/profile types.
4. UI state may wrap shared contracts locally, but cannot redefine public auth/profile shapes.

## Implementation Design

### Core Interfaces

Canonical contract shape, shown in Go only to satisfy the template requirement:

```go
type AuthSession struct {
    AccessToken string      `json:"access_token"`
    Subject     AuthSubject `json:"subject"`
}

type AuthSubject struct {
    ID    string `json:"id"`
    Name  string `json:"name"`
    Email string `json:"email"`
    Role  string `json:"role"`
}
```

Primary TypeScript contracts should include:

```ts
export type TaskGoUserRole = 'CUSTOMER' | 'PROVIDER';
export type TaskGoAdminRole = 'ADMINISTRATOR' | 'SUPPORT' | 'FINANCE' | 'MODERATOR';

export interface AuthLoginRequest {
  readonly email: string;
  readonly password: string;
}

export interface CustomerAuthSession {
  readonly access_token: string;
  readonly user: PublicUserProfile;
}
```

### Data Models

Shared JSON-safe models:

- `AuthLoginRequest`: email and password.
- `CustomerAuthSession`: access token and public user profile.
- `AdminAuthSession`: access token and admin operator.
- `AdminMeResponse`: admin operator wrapper.
- `PublicUserProfile`: id, name, email, phone, cpf, role/type, photoUrl, verification fields, timestamps as strings when exposed.
- `UserRegistrationRequest`: registration payload for customer/provider signup.
- `UserProfileUpdateRequest`: editable profile fields only.
- `AdminOperatorProfile`: id, name, email, role, active, activatedAt as `string | null`.

Explicit exclusions:

- No `password`, `passwordHash`, Prisma model types, `bigint`, raw `Date`, orders, reviews, provider internals, or backend-only token payloads in public shared contracts.
- Address summaries may be included only where needed by registration/profile payloads. Full address domain expansion belongs to a later phase.

### API Endpoints

No endpoint path changes are required.

Affected existing endpoints:

- `POST /auth/login`: response typed as `CustomerAuthSession`, optionally with existing provider-home extension handled outside the shared base session.
- `POST /auth/register`: request typed against shared registration contract through backend DTO adapter; response typed as `CustomerAuthSession`.
- `GET /user/:id`: response typed as `PublicUserProfile` or a profile-specific response wrapper.
- `PATCH /user/:id`: request typed as `UserProfileUpdateRequest`; response typed as `PublicUserProfile`.
- `POST /admin/auth/login`: request typed as `AuthLoginRequest`; response typed as `AdminAuthSession`.
- `GET /admin/auth/me`: response typed as `AdminMeResponse`.

## Impact Analysis

| Component | Impact Type | Description and Risk | Required Action |
|-----------|-------------|----------------------|-----------------|
| `libs/shared` | new | Public auth/profile contract module becomes the source of truth. Low risk. | Add contracts and barrel exports. |
| `tsconfig.base.json` | modified | Existing aliases mostly support shared imports, but Angular app configs may need path alignment. Medium risk. | Ensure all three projects resolve `@taskgo/shared`. |
| Backend auth/user/admin auth | modified | DTOs remain local, responses must map to shared JSON-safe types. Medium risk. | Add adapters or return type annotations; remove sensitive public fields. |
| Customer frontend auth/profile | modified | Local models are replaced directly. Medium risk. | Update imports and adjust UI code to local view models only where needed. |
| Backoffice auth/session | modified | Admin session model moves to shared contracts. Low-medium risk. | Replace local contract definitions and keep storage service behavior. |
| Tests/build config | modified | Validation depends on build/type-check across all apps. Medium risk. | Ensure root scripts or Nx targets catch type drift. |

## Testing Approach

### Unit Tests

No dedicated shared runtime unit tests are required for pure type-only contracts unless adapters contain logic. If backend mapping helpers are added, test:

- internal user/admin records map to JSON-safe public contracts;
- sensitive fields are excluded;
- `bigint` and `Date` values serialize to strings.

### Integration Tests

No new endpoint integration test requirement for the MVP. Existing endpoint tests should be updated only where return shapes change.

### Build and Type Validation

Mandatory validation:

- Run backend build/type-check.
- Run customer frontend build/type-check.
- Run backoffice build/type-check.
- Run root `npm run build` if it covers the affected Nx projects reliably.

Passing build/type-check across all three projects is the acceptance gate for shared contract compatibility.

## Development Sequencing

### Build Order

1. Add shared auth/profile contracts in `libs/shared` - no dependencies.
2. Export shared contracts from shared barrels - depends on step 1.
3. Ensure backend, frontend, and backoffice can resolve `@taskgo/shared` imports - depends on step 2.
4. Update backend DTOs/response mappers for customer auth/profile endpoints - depends on step 3.
5. Update backend DTOs/response mappers for admin auth endpoints - depends on step 3.
6. Replace customer frontend auth/profile local models with shared imports - depends on steps 3 and 4.
7. Replace backoffice auth/session local models with shared imports - depends on steps 3 and 5.
8. Remove deprecated local public auth/profile model definitions - depends on steps 6 and 7.
9. Run build/type-check validation across backend, frontend, and backoffice - depends on steps 4 through 8.

### Technical Dependencies

- Existing Nx workspace and npm workspaces remain in place.
- No database migration is required.
- No new runtime package is required.
- No API route redesign is required.

## Monitoring and Observability

No new runtime monitoring is required because this is a contract and type consolidation. Existing backend logs and auth/admin telemetry remain unchanged.

Implementation should avoid changing auth behavior. Any endpoint response mapping changes should preserve current operational telemetry fields and error behavior.

## Technical Considerations

### Key Decisions

- Decision: Use pure serializable TypeScript contracts in `libs/shared`.
- Rationale: Frontends need JSON-safe public contracts; backend DTOs need framework-specific decorators.
- Trade-off: Backend keeps adapter code instead of sharing one decorated class everywhere.
- Alternatives rejected: shared validation classes, generated contracts, and temporary local compatibility aliases.

### Known Risks

- Risk: Existing local models include fields not suitable for public shared contracts.
  Mitigation: Keep app-specific view models local and exclude internal/sensitive fields from shared types.

- Risk: Direct replacement creates broad compile failures during migration.
  Mitigation: Migrate by endpoint family and use build/type-check as the main feedback loop.

- Risk: Angular project-local path aliases may interfere with shared imports.
  Mitigation: Confirm `@taskgo/shared` resolution in each project before replacing model imports.

- Risk: Provider-home data currently rides on customer login responses.
  Mitigation: Keep provider-home as an app-specific extension outside the base shared auth session for MVP.

## Architecture Decision Records

- [ADR-001: Prioritize Shared Domain Language for Authentication and Profile](adrs/adr-001.md) - Selects a domain language-first MVP for authentication and profile while keeping scope focused.
- [ADR-002: Use Pure Serializable TypeScript Contracts for Auth and Profile](adrs/adr-002.md) - Chooses shared JSON-safe TypeScript contracts, direct MVP replacement, and build/type-check validation.
