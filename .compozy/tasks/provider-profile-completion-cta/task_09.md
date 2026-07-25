---
status: pending
title: "Persist and update structured provider social links"
type: backend
complexity: high
dependencies:
  - task_03
  - task_04
---

# Task 09: Persist and update structured provider social links

## Overview

Deliver the authenticated provider operation for replacing the four supported social-link fields persisted by task 03. The domain must validate and normalize WhatsApp, Instagram, Facebook, and LinkedIn consistently, preserve the legacy `linkdin` spelling only at registration compatibility input, and provide the canonical completion signal consumed by the profile-completion query.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- The backend MUST persist WhatsApp, Instagram, Facebook, and LinkedIn as separate nullable provider fields introduced by task 03 and MUST return only the canonical task 02 social-link contract.
- `PUT /provider/me/social-links` MUST derive the provider identity from the authenticated task 04 boundary, require the `PRESTADOR` role, and MUST NOT accept a route, query, or body identifier that selects another provider.
- The update operation MUST replace the complete supported social-link set in one atomic persistence operation so omitted or explicitly cleared fields follow the task 02 contract consistently.
- Each non-empty field MUST be normalized and validated for its network: WhatsApp must use the approved phone representation and Instagram, Facebook, and LinkedIn must reject malformed, unsupported, or cross-network values.
- The canonical update endpoint MUST reject the misspelled `linkdin` property; legacy `linkdin` MUST be accepted only by the registration compatibility boundary and normalized to `linkedin` before provider persistence.
- Social profile completion MUST be true when at least one of the four canonical persisted fields contains a valid normalized value, and false when all four fields are null or empty.
- Responses and errors MUST not expose unrelated provider data, and an invalid request MUST leave every previously stored social field unchanged.
</requirements>

## Subtasks

- [ ] 09.1 Define validation, normalization, clearing, and replacement rules for all four canonical social fields.
- [ ] 09.2 Implement atomic persistence and retrieval of the authenticated provider's structured social links.
- [ ] 09.3 Expose the provider-only singular `/provider/me/social-links` update operation using the task 04 identity boundary.
- [ ] 09.4 Keep `linkdin` compatibility exclusively in provider registration and reject it from the canonical update contract.
- [ ] 09.5 Provide a reusable canonical social-completion result based on at least one valid persisted field.
- [ ] 09.6 Add unit and integration coverage for validation, normalization, clearing, ownership, compatibility, and completion semantics.

## Implementation Details

Follow the TechSpec sections “Data Models — Provider social profile,” “API Endpoints,” and “Development Sequencing.” Use the structured fields and migration delivered by task 03, the public shared contracts from task 02, and the authenticated identity/role boundary from task 04. The existing generic `PATCH /provider/:id` is a placeholder and must not become the social update path.

Keep update behavior in the provider domain and perform one provider-row mutation only after every supplied value passes validation. The task 12 completion query must consume a canonical completion result derived from persisted normalized values rather than duplicate permissive string checks. Registration compatibility may translate `linkdin` when building the provider record, but no new response, DTO, service method, or `/provider/me` payload may expose that spelling.

### Relevant Files

- `apps/backend/src/modules/provider/provider.controller.ts` — Owns singular provider routes and currently exposes only an unsafe placeholder update by arbitrary ID.
- `apps/backend/src/modules/provider/provider.service.ts` — Provider-domain persistence boundary where atomic social replacement and completion evaluation belong.
- `apps/backend/src/modules/provider/provider.module.ts` — Registers and exports provider-domain capabilities consumed by the later completion query.
- `apps/backend/src/prisma/schema.prisma` — Contains the structured provider social fields delivered by task 03.

### Dependent Files

- `libs/shared/src/auth-profile/index.ts` — Supplies the canonical task 02 social mutation and response contracts while retaining registration-only compatibility input.
- `apps/backend/src/modules/user/commands/create-user/create-user.command.ts` — Registration boundary that may accept legacy `linkdin` and must normalize it before persistence.
- `apps/backend/src/modules/provider/provider.controller.spec.ts` — Existing provider route suite to extend with validation, role, identity, replacement, and response-contract coverage.

### Related ADRs

- [ADR-001: Centralized Provider Profile Completion Journey](adrs/adr-001.md) — Defines social links as a recommended checklist item in the centralized provider journey.
- [ADR-003: Server-Derived Profile Completion Resource](adrs/adr-003.md) — Requires focused authenticated mutations and a server-derived canonical completion state.

## Deliverables

- Atomic provider-domain operation that validates, normalizes, replaces, and returns the four canonical structured social fields.
- Authenticated provider-only `PUT /provider/me/social-links` endpoint using token-derived identity and the singular route convention.
- Registration-only `linkdin` compatibility normalization with canonical `linkedin` persistence and strict rejection on the update endpoint.
- Reusable social-completion evaluation that is true for at least one valid canonical value and false when all fields are cleared.
- Validation and error behavior that preserves existing stored values when any submitted field is invalid.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for authenticated structured-social persistence and completion behavior **(REQUIRED)**

## Tests

- Unit tests:
  - [ ] A payload with valid normalized WhatsApp, Instagram, Facebook, and LinkedIn values produces the canonical four-field persistence update.
  - [ ] WhatsApp normalization accepts the approved formatted Brazilian number and persists its canonical representation; an impossible or unsupported number is rejected.
  - [ ] Valid Instagram, Facebook, and LinkedIn representations normalize to their respective canonical values, while a LinkedIn value submitted in the Instagram field and malformed URLs are rejected.
  - [ ] Omitting or explicitly clearing fields follows the task 02 replacement contract and can clear all four fields in one update.
  - [ ] A payload containing canonical `linkedin` succeeds, while one containing `linkdin` is rejected by the update DTO's whitelist validation.
  - [ ] Registration with only legacy `linkdin` persists canonical `linkedin`; when both spellings arrive, the task 02 precedence rule is applied once.
  - [ ] Social completion is true for each individual valid field and for multiple fields, and false when all canonical fields are null or empty.
  - [ ] If any field is invalid, the service performs no Prisma update and preserves all prior social values.
- Integration tests:
  - [ ] An authenticated `PRESTADOR` updating `/provider/me/social-links` receives the canonical response and all four normalized values are readable from that provider's Prisma record.
  - [ ] An authenticated `CLIENTE` receives `403`, an anonymous request receives `401`, and neither request changes provider data.
  - [ ] A provider cannot select another provider by injecting `providerId` or `userId`; whitelist validation rejects the property or the service still mutates only the token-derived provider.
  - [ ] Replacing an existing four-field profile with one valid LinkedIn value clears the other fields and keeps social completion true.
  - [ ] Clearing all supported fields persists null values and makes the canonical social-completion result false.
  - [ ] Registration accepts a legacy `linkdin` payload, while the same property sent to `/provider/me/social-links` returns `400`.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- Providers can atomically manage all four supported social fields through the authenticated singular endpoint.
- Customer, anonymous, and cross-provider requests cannot modify provider social data.
- Canonical update contracts and responses contain `linkedin` only; `linkdin` works exclusively at the registration compatibility boundary.
- At least one valid persisted social value marks the social checklist item complete, while clearing all values marks it pending.
- Invalid social input never partially updates or destroys previously stored values.
