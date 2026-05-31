---
status: pending
title: Align frontend order journey with trusted contracts
type: frontend
complexity: high
dependencies:
  - task_05
---

# Task 06: Align frontend order journey with trusted contracts

## Overview

Adapt the frontend contracting, customer-history, provider-history, summary, confirmation, and cancellation journeys to the trusted backend contracts. The current interface sends customer identity, provider identity, and a zero authoritative price from browser state, and its response models assume broad private data exposure.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- 1. The frontend MUST stop sending customer identity as an authoritative contracting input.
- 2. The frontend MUST stop sending an authoritative order price override.
- 3. The frontend MUST stop sending provider identity as an authorization input for provider history, confirmation, and cancellation.
- 4. Customer and provider screens MUST continue to support their existing order journeys using authenticated backend behavior.
- 5. Frontend order models MUST remove assumptions that credentials and unrelated private data are present.
- 6. The official service price MUST remain visible to the customer before order submission.
- 7. Because `_techspec.md` is missing, the final protected endpoint shapes MUST follow the backend contracts delivered by `task_05`.
</requirements>

## Subtasks

- [ ] 06.1 Update contracting payloads to submit only customer-selected service context and supported optional values.
- [ ] 06.2 Update customer and provider history requests to rely on authenticated identity.
- [ ] 06.3 Update provider summary, confirmation, and cancellation requests to rely on authenticated identity.
- [ ] 06.4 Narrow frontend order and provider models to the contextual fields returned by protected responses.
- [ ] 06.5 Add frontend tests for request payloads, URLs, and user-visible order journeys.

## Implementation Details

The current `SingleUser.register()` method explicitly sends `clientId` and `finalPrice: 0`. Provider actions append `providerId` to URLs. Update the frontend only after the protected backend route contracts are known from `task_05`.

### Relevant Files

- `apps/frontend/src/app/shared/service/provider/provider.model.ts` — Current contracting request model exposes spoofable fields.
- `apps/frontend/src/app/shared/service/provider/provider.ts` — Contracting HTTP request.
- `apps/frontend/src/app/shared/service/order/order.ts` — Current history and provider-action URLs include client-controlled identities.
- `apps/frontend/src/app/shared/service/order/order.model.ts` — Broad response model includes sensitive and internal fields.
- `apps/frontend/src/app/modules/common/single-user/single-user.ts` — Builds the current contracting payload.

### Dependent Files

- `apps/frontend/src/app/modules/customer/home/home.ts` — Customer order history consumer.
- `apps/frontend/src/app/modules/providers/home/home.ts` — Provider order history consumer.
- `apps/frontend/src/app/modules/providers/pending-approval/pending-approval.ts` — Order summary and provider-action consumer.
- `apps/frontend/src/app/shared/interceptors/token/token.interceptor.ts` — Existing bearer-token transport for protected requests.
- `apps/frontend/src/app/shared/service/user-logged/user-logged.model.ts` — Logged-user assumptions may narrow after data minimization.

### Related ADRs

- [ADR-001: Protect the Complete Critical Marketplace Journey](adrs/adr-001.md) — Requires trusted pricing, authenticated identity, and contextual response data across the contracting journey.

## Deliverables

- Trusted frontend contracting payload without authoritative identity or price overrides.
- Authenticated customer and provider order requests without browser-supplied authorization identity.
- Narrow order-facing frontend models aligned with contextual responses.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for the frontend contracting and provider-action journey **(REQUIRED)**

## Tests

- Unit tests:
  - [ ] Contracting request payload excludes `clientId`.
  - [ ] Contracting request payload excludes authoritative `finalPrice`.
  - [ ] Customer history request does not accept a customer ID override.
  - [ ] Provider history request does not accept a provider ID override.
  - [ ] Provider confirm and cancel requests do not include a provider ID authorization override.
  - [ ] Order-facing models do not declare password hashes or unrelated private fields as expected response data.
- Integration tests:
  - [ ] Authenticated customer contracts an active service while seeing the official displayed price.
  - [ ] Authenticated customer opens their order history after contract creation.
  - [ ] Authenticated provider opens pending order summary and confirms an owned order.
  - [ ] Authenticated provider cancels an owned eligible order.
  - [ ] Access-denied responses produce a clear user-visible error without exposing unrelated record details.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- Browser requests no longer control authoritative customer identity, provider identity, or price.
- Customer and provider order screens remain usable with protected backend contracts.
- Frontend order models no longer depend on overexposed sensitive data.
