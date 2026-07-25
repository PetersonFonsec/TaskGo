---
status: completed
title: Define shared profile-completion and mutation contracts
type: backend
complexity: medium
dependencies:
  - task_01
---

# Task 02: Define shared profile-completion and mutation contracts

## Overview
Define the stable, JSON-safe contracts that the backend and Angular application will share for profile-completion queries and focused domain mutations. These contracts establish the vocabulary for checklist state, grouped progress, payout and social requests, and masked financial responses without coupling completion to the cached authentication session.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- 1. The shared library MUST define stable identifiers for `BANK_ACCOUNT`, `PHOTO`, `SOCIAL_LINKS`, and `ADDRESS`, plus the `PENDING`, `PROCESSING`, `COMPLETE`, and `ERROR` item states described in the TechSpec.
- 2. The profile-completion response MUST represent required and recommended group progress, all checklist items, payout readiness, and overall completion using JSON-safe values.
- 3. Financial mutation contracts MUST reflect the Pagar.me capabilities confirmed by task 01 and MUST separate write-only input from responses containing status and masked metadata only.
- 4. The social-links mutation MUST expose structured `whatsapp`, `instagram`, `facebook`, and `linkedin` fields; `linkdin` MUST remain outside the new canonical contract.
- 5. Contracts MUST support focused mutations under the singular `/provider/me` and `/user/me` route convention and MUST NOT add completion state to `CustomerAuthSession`, `PublicUserProfile`, or another cached login aggregate.
- 6. The API contract MUST keep frontend route destinations out of completion items and MUST prevent raw account numbers, branch numbers, or other gateway secrets from appearing in response types.
- 7. Both backend and frontend consumers MUST resolve the contracts through the existing `@taskgo/shared` public export.
</requirements>

## Subtasks
- [x] 02.1 Define the canonical checklist identifiers, statuses, item shape, grouped progress, and aggregate completion response.
- [x] 02.2 Define bank-account mutation requests consistent with the verified Pagar.me capability boundary.
- [x] 02.3 Define payout status and mutation responses containing only synchronization state and approved masked metadata.
- [x] 02.4 Define the structured social-links update request and response contract with canonical LinkedIn naming.
- [x] 02.5 Export the new contracts from the shared library without changing customer authentication or public-user session shapes.
- [x] 02.6 Add compile-time and cross-application contract verification for accepted shapes and prohibited sensitive or legacy fields.

## Implementation Details
Place the new focused contracts beside the existing auth/profile contracts in `libs/shared`, and expose them through the current package barrel. Follow the TechSpec sections “Core Interfaces,” “Data Models,” and “API Endpoints”; task 01 is authoritative where its Pagar.me findings constrain financial request fields or supported states. Preserve the established JSON conventions (`JsonId`, `JsonDateTime`) and readonly request/response shapes.

The contracts describe payloads only. They must not encode Angular routes, gateway-specific response objects, persistence models, validation implementation, or changes to the login payload. Downstream tasks 03, 06, 08, 09, 12, and 13 will depend on these names and boundaries, so changes after completion require coordinated compatibility review.

### Relevant Files
- `libs/shared/src/auth-profile/index.ts` — Contains the current shared auth/profile vocabulary and the legacy registration social payload.
- `libs/shared/src/index.ts` — Public `@taskgo/shared` export surface used by both applications.
- `libs/shared/src/auth-profile/auth-profile.contracts.type-spec.ts` — Establishes compile-time positive and negative contract checks.
- `tsconfig.base.json` — Defines the workspace aliases through which both applications consume shared contracts.

### Dependent Files
- `apps/backend/src/shared/contracts/shared-auth-profile-import.spec.ts` — Verifies backend resolution of shared request and response types.
- `apps/frontend/src/app/shared/contracts/shared-auth-profile-import.spec.ts` — Verifies frontend resolution of the same public contract surface.
- `apps/frontend/src/app/shared/service/user-logged/user-logged.model.ts` — Must remain unchanged in meaning so profile completion stays independent from cached login state.

### Related ADRs
- [ADR-002: Gateway-Owned Provider Payout Data](adrs/adr-002.md) — Constrains financial responses to synchronization state and masked, non-sensitive metadata.
- [ADR-003: Server-Derived Profile Completion Resource](adrs/adr-003.md) — Requires a dedicated completion response, focused mutations, stable item identifiers, and no frontend routes or login-aggregate extension.

## Deliverables
- Exported shared types for completion items, group progress, and the aggregate profile-completion response.
- Exported shared payout requests and safe masked payout status/mutation responses aligned with task 01.
- Exported structured social-links request and response contracts using canonical `linkedin`.
- Compile-time contract checks that reject route fields, legacy `linkdin`, raw financial response values, and completion fields on the customer session.
- Backend and frontend shared-library import verification.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for shared contract consumption by backend and frontend **(REQUIRED)**

## Tests
- Unit tests:
  - [x] A completion fixture containing all four canonical item identifiers and all four statuses satisfies the aggregate response contract.
  - [x] Required and recommended progress accept numeric `completed` and `total` values while `payoutReady` and `allComplete` remain booleans.
  - [x] Structured social updates accept WhatsApp, Instagram, Facebook, and LinkedIn values, including an update where all optional fields are absent or null as permitted by the finalized contract.
  - [x] Compile-time negative checks reject `linkdin` on the canonical social mutation and reject frontend destination fields on completion items.
  - [x] Compile-time negative checks reject raw bank account or branch values on payout response types.
  - [x] `CustomerAuthSession` and `PublicUserProfile` reject injected profile-completion state.
- Integration tests:
  - [x] Backend test code imports and constructs the completion query response and masked payout response from `@taskgo/shared`.
  - [x] Frontend test code imports and constructs the same completion and social mutation contracts from `@taskgo/shared`.
  - [x] Workspace type checking succeeds with both consumers using the public barrel and no direct internal-path imports.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Backend and frontend compile against one public set of profile-completion and mutation contracts.
- The aggregate response represents exactly four checklist identifiers, separate group progress, payout readiness, and overall completion.
- Public payout response types expose no raw financial value and use only approved masked metadata.
- Existing cached authentication and public-user contract shapes remain free of profile-completion state.
