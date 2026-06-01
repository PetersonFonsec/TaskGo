# TechSpec: Profile screens (clients & professionals)

## Summary

This TechSpec translates the PRD (.compozy/tasks/profile-perfil/_prd.md) into an implementation-ready plan for the shared core profile MVP and the subsequent role-specific extensions.

## Goals
- Support editable core profile fields for Clients and Professionals: display name, avatar, primary email, primary phone, and labeled addresses.
- Allow multiple labeled addresses (home, work, service area).
- Trigger verification when phone or email changes.
- Provide a clear migration path to add role-specific fields (credentials, service areas, business hours).

## Scope (MVP)
- Frontend: Profile view and Edit screens/components; address management UI; client & professional shared components.
- Backend: endpoints for reading/updating core profile fields; address CRUD; verification triggers for phone/email changes.
- Cross-cutting: validation rules, audit logging for profile changes, privacy controls.

## Non-Goals
- Full professional business-hour editor (Phase 2).
- Mapping/polygon drawing for service areas (Phase 2+).

## Data Model (high-level)
- `UserProfile` (core): id, userId, displayName, avatarUrl, primaryEmail {value, verified}, primaryPhone {value, verified}, addresses[] {id, label, street, city, state, postalCode, country, isPrimary}, metadata (timestamps, changeHistoryRef)
- Keep schema changes additive to support phased rollout.

## API Endpoints (examples)
- GET /profiles/:id — returns core profile
- PATCH /profiles/:id — updates allowed fields; partial updates supported
- POST /profiles/:id/addresses — add address
- PATCH /profiles/:id/addresses/:addrId — update address
- DELETE /profiles/:id/addresses/:addrId — remove address
- POST /profiles/:id/verify-email — send verification
- POST /profiles/:id/verify-phone — trigger phone verification

## Frontend Architecture (high-level)
- Shared `ProfileView` component displaying core fields and address list.
- `ProfileEdit` component/form used for editing (modal or dedicated route); uses form schema with role-aware optional sections.
- Reusable `AddressList` and `AddressForm` components supporting labeled addresses.
- Centralized client-side validation + error handling consistent with existing form patterns.

## UX & Flows
- Edit-in-place vs edit-screen: implement Edit screen first (simpler for validation and verification flows). Consider inline editing in Phase 2.
- Verification flow: on change, save new value in pending state and call verification endpoint; show status as "Pending verification" until confirmed.

## Validation & Edge Cases
- Enforce required fields for onboarding flows separately from normal edits.
- Prevent deletion of primary address unless another primary is selected.
- Handle concurrent edits with optimistic UI and server-side conflict resolution.

## Security & Privacy
- Only authenticated users may read/update their own profile.
- Phone/email verification must not expose verification tokens in responses/logs.
- Log changes with minimal PII exposure for audit; comply with applicable privacy laws.

## Migration & Backwards Compatibility
- Additive schema changes only; existing users should map to core fields with sensible defaults (e.g., first address becomes primary).

## Acceptance Criteria
- Users can view and edit core profile fields and add up to N addresses (N configurable).
- Phone/email changes trigger verification and show pending state until confirmed.
- All edits persist and are reflected in the profile view immediately after successful save.

## Implementation Tasks (suggested)
- Backend: profile read/update endpoints, address CRUD, verification triggers, change logging (2-3 dev days)
- Frontend: `ProfileView`, `ProfileEdit`, `AddressList`, `AddressForm`, validation (3-5 dev days)
- Integration: hook verification workflows to existing auth/notification systems (1-2 dev days)
- QA: E2E tests for edit/save/verify flows (1-2 QA days)

## Testing
- Unit tests for form validation and API contract mocks.
- E2E tests for full edit and verification flows (Cypress spec updates).

## Rollout Plan
- Feature flag the edit functionality for staged rollout.
- Monitor profile completion metric and edit success rate; rollback if error spike.

## Open Implementation Questions
- Should edits be permitted while prior verification is pending or must the user wait?
- Maximum number of addresses allowed per user?
- Which notification channels exist for verification (SMS/email providers)?

## References
- PRD: ../_prd.md
- ADR: ../adrs/adr-001.md

---

*Starter TechSpec generated 2026-05-30*