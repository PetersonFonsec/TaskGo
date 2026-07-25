---
status: completed
title: Add payout-profile and structured-social persistence
type: backend
complexity: high
dependencies:
  - task_01
  - task_02
---

# Task 03: Add payout-profile and structured-social persistence

## Overview
Add the durable Prisma state needed to represent a provider's gateway synchronization, bank-account completion, and structured social profile. The migration must preserve existing providers safely, retain Pagar.me as the financial source of truth, and leave unverified payout capabilities incomplete until later synchronization confirms them.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- 1. The Prisma schema MUST represent a one-to-one provider payout profile containing the Pagar.me recipient identifier, synchronization status, bank-account completion state, masked display metadata, last synchronization time, and a non-sensitive error code.
- 2. Financial persistence MUST NOT contain raw account credentials, full account or branch numbers, passwords, or provider documents.
- 3. Payment readiness MUST be derivable only from explicit gateway-confirmed bank-account state; the presence of `pagarmeRecipientId` MUST NOT imply readiness.
- 4. Existing `pagarmeRecipientId` values MUST be preserved or migrated without marking either financial requirement complete.
- 5. Migration and model defaults MUST leave existing and newly created providers in a safe pending or unknown synchronization state until gateway reconciliation occurs.
- 6. The provider model MUST persist nullable structured fields for WhatsApp, Instagram, Facebook, and LinkedIn, using the correctly spelled `linkedin` field in the new data model.
- 7. Provider registration MUST retain submitted supported social values instead of discarding them, while accepting legacy `linkdin` only at the compatibility boundary and normalizing it to `linkedin`.
- 8. Database constraints and indexes MUST enforce one payout profile per provider and uniqueness for non-null Pagar.me recipient identifiers.
- 9. The migration MUST be backward-compatible with existing provider creation, payment, backoffice, and test fixtures that currently use `Provider.pagarmeRecipientId`.
</requirements>

## Subtasks
- [x] 03.1 Define explicit payout synchronization and per-requirement completion states in the Prisma data model.
- [x] 03.2 Add the one-to-one payout profile and structured provider social fields with safe nullable values and database constraints.
- [x] 03.3 Create a backward-compatible migration that preserves recipient identifiers and backfills unknown or pending financial states without inferring readiness.
- [x] 03.4 Extend provider registration input so supported social fields reach provider persistence and legacy `linkdin` is normalized to `linkedin`.
- [x] 03.5 Verify that new and existing providers receive safe financial defaults and that no sensitive payout values are stored.
- [x] 03.6 Add regression coverage for migration behavior, provider creation, structured social persistence, and recipient-ID-only providers.

## Implementation Details
Follow the TechSpec sections **Data Models**, **Impact Analysis**, and **Development Sequencing**. This task owns the persistence foundation only; gateway synchronization behavior and authenticated social-update APIs remain in their dependent tasks.

Keep the existing `Provider` relation and public/admin consumers compatible while introducing the payout-profile relation. If task 01 changes the supported Pagar.me state vocabulary, use that verified vocabulary for the Prisma enums without weakening the rule that only explicit confirmation can establish completion. Use the shared contracts from task 02 at input boundaries, but do not duplicate their transport types in the Prisma layer.

The migration must be deployable against populated PostgreSQL databases. Existing recipient identifiers may be moved into the new one-to-one profile or retained temporarily for compatibility, but the chosen transition must avoid two authoritative writable copies and must not convert recipient existence into bank or Pix confirmation.

### Relevant Files
- `apps/backend/src/prisma/schema.prisma` — Current `Provider` model contains only `pagarmeRecipientId` and has no structured social or payout-state model.
- `apps/backend/src/prisma/migrations/20250825223940_pagarme_integration_fields/migration.sql` — Establishes the existing recipient identifier column and uniqueness constraint that the new migration must preserve safely.
- `apps/backend/src/modules/user/commands/create-user/create-user.command.ts` — Registration command currently omits the social payload sent by the frontend.
- `apps/backend/src/modules/user/commands/create-user/validations/user-service.validator.ts` — Creates the provider record and is the existing persistence integration point for provider-specific registration data.
- `libs/shared/src/auth-profile/index.ts` — Defines the registration social compatibility contract, including both legacy `linkdin` and canonical `linkedin`.

### Dependent Files
- `apps/backend/src/modules/user/commands/create-user/validations/user-service.validator.spec.ts` — Provider-creation expectations must cover safe payout defaults and persisted structured social values.
- `apps/backend/src/modules/payments/payment.service.ts` — A later task must replace its current recipient-ID-only eligibility check with explicit payout readiness from this model.

### Related ADRs
- [ADR-002: Gateway-Owned Provider Payout Data](adrs/adr-002.md) — Constrains local persistence to gateway identifiers, synchronization state, completion indicators, and masked metadata.
- [ADR-003: Server-Derived Profile Completion Resource](adrs/adr-003.md) — Requires durable, explicit item states that the completion resource can calculate on the server.

## Deliverables
- Updated Prisma schema with payout-profile relations, explicit payout-state enums, structured social fields, constraints, and safe defaults.
- Backward-compatible migration and backfill preserving existing recipient identifiers without inferring bank-account or aggregate payout readiness.
- Provider registration persistence for WhatsApp, Instagram, Facebook, and canonical LinkedIn values with legacy input normalization.
- Generated Prisma client compatibility for existing provider creation and querying call sites.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for payout-profile migration defaults and structured-social persistence **(REQUIRED)**

## Tests
- Unit tests:
  - [x] Creating a provider without financial data assigns pending or unknown synchronization and bank-account states.
  - [x] Creating a provider with only `pagarmeRecipientId` does not mark bank-account completion or payout readiness as complete.
  - [x] Registration with WhatsApp, Instagram, Facebook, and `linkedin` persists each value in its canonical structured field.
  - [x] Registration with legacy `linkdin` and no `linkedin` persists the value as canonical `linkedin`.
  - [x] Registration with both `linkedin` and legacy `linkdin` follows the task-02 contract precedence and never creates two stored LinkedIn values.
  - [x] Payout-profile persistence accepts only masked bank metadata and non-sensitive gateway error codes exposed by the model contract.
- Integration tests:
  - [x] Applying the migration to a database containing a provider with `pagarme_recipient_id` preserves the identifier and leaves both financial completion states unconfirmed.
  - [x] Applying the migration to a provider without a recipient identifier creates or permits the safe default payout state without violating one-to-one constraints.
  - [x] Two payout profiles cannot reference the same provider, and duplicate non-null Pagar.me recipient identifiers are rejected.
  - [x] Creating a provider through the existing registration transaction persists all supported social fields and remains readable through Prisma after commit.
  - [x] Existing payment and backoffice fixtures that create providers with a recipient identifier remain schema-compatible while readiness stays explicitly unconfirmed.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Every provider has an unambiguous, server-readable synchronization and bank-account state after migration.
- No existing recipient identifier is lost, and no migrated provider becomes payout-ready solely because that identifier exists.
- Prisma stores no raw bank credentials.
- Provider registration persists the four approved structured social fields with canonical `linkedin` naming.
- The schema exposes a single constrained payout-profile record per provider for tasks 07 and 12.
