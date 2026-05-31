---
status: pending
title: Enforce order read and provider-action authorization
type: backend
complexity: high
dependencies:
  - task_02
  - task_04
---

# Task 05: Enforce order read and provider-action authorization

## Overview

Restrict order reads and provider actions to the authenticated participant entitled to use them. Existing routes accept customer and provider IDs from the path, and order summaries can disclose broad client records before a trustworthy ownership boundary is applied.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- 1. Customers MUST access only orders associated with their authenticated identity.
- 2. Providers MUST access and act only on orders associated with services they own.
- 3. Order summary responses MUST expose only contextual data required by the authorized journey.
- 4. Provider confirmation and cancellation MUST derive provider identity from the authenticated session rather than a client-controlled path identifier.
- 5. Unauthorized access MUST fail without revealing whether another participant's order exists.
- 6. Existing valid provider state-transition rules MUST remain enforced.
- 7. Because `_techspec.md` is missing, the final route shapes and shared policy boundaries MUST be selected during implementation and coordinated with `task_06`.
</requirements>

## Subtasks

- [ ] 05.1 Scope customer order history to the authenticated customer.
- [ ] 05.2 Scope provider order history and order summaries to the authenticated provider's services.
- [ ] 05.3 Remove client control over provider identity in confirmation and cancellation actions.
- [ ] 05.4 Preserve valid confirmation and cancellation state-transition rules.
- [ ] 05.5 Minimize contextual order response data and add authorization regression tests.

## Implementation Details

The current controller forwards path-provided `clientId` and `providerId` values directly to `OrderService`. Existing service methods already check provider ownership for confirm and cancel, but they trust the provider ID supplied by the browser. Reuse the authenticated foundation from `task_01` and the response minimization boundary from `task_02`.

### Relevant Files

- `apps/backend/src/modules/order/order.controller.ts` — Current customer and provider path IDs and unrestricted summary/update/delete routes.
- `apps/backend/src/modules/order/order.service.ts` — Customer history, provider history, summary, confirmation, cancellation, and broad includes.
- `apps/backend/src/modules/order/dto/update-order.dto.ts` — Mutable fields require least-privilege review.
- `apps/backend/src/prisma/schema.prisma` — Defines client, service, provider, payment, review, and address snapshot relationships.

### Dependent Files

- `apps/frontend/src/app/shared/service/order/order.ts` — Current methods send customer and provider IDs in URLs.
- `apps/frontend/src/app/shared/service/order/order.model.ts` — Current order response model includes broad personal and internal fields.
- `apps/frontend/src/app/modules/providers/home/home.ts` — Provider history consumer.
- `apps/frontend/src/app/modules/providers/pending-approval/pending-approval.ts` — Provider summary, confirmation, and cancellation consumer.
- `apps/frontend/src/app/modules/customer/home/home.ts` — Customer history consumer.

### Related ADRs

- [ADR-001: Protect the Complete Critical Marketplace Journey](adrs/adr-001.md) — Requires customers and providers to access only entitled orders with contextual data minimization.

## Deliverables

- Authenticated customer and provider order history boundaries.
- Authorized and minimized order summary behavior.
- Provider confirmation and cancellation based on authenticated provider identity.
- Preserved order state-transition rules.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for order authorization and provider actions **(REQUIRED)**

## Tests

- Unit tests:
  - [ ] Customer history query uses the authenticated customer ID.
  - [ ] Provider history query returns only orders attached to services owned by the authenticated provider.
  - [ ] Provider summary access is denied when the order belongs to another provider's service.
  - [ ] Provider confirmation succeeds for an owned `PENDENTE` order.
  - [ ] Provider confirmation is denied for another provider's order.
  - [ ] Provider cancellation succeeds only for owned `PENDENTE` or `CONFIRMADO` orders.
  - [ ] Order summary excludes password hashes and unrelated private fields.
- Integration tests:
  - [ ] Authenticated customer A cannot retrieve customer B order history by changing an identifier.
  - [ ] Authenticated provider A cannot retrieve provider B order history or summary.
  - [ ] Authenticated provider A cannot confirm or cancel provider B order.
  - [ ] Anonymous order-history, order-summary, confirmation, and cancellation requests are rejected.
  - [ ] Authorized customer and provider journeys continue to return the contextual information needed by their screens.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- Zero known cases of users viewing or changing third-party orders.
- Provider actions cannot be authorized using a browser-supplied provider identity.
- Authorized order responses contain no credentials or unrelated private data.
