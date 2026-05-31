---
status: pending
title: Secure order creation with official pricing
type: backend
complexity: high
dependencies:
  - task_01
---

# Task 04: Secure order creation with official pricing

## Overview

Protect order creation from identity spoofing and price manipulation. The current endpoint accepts both `clientId` and `finalPrice` from the browser, allowing the requester to create an order for another user or override the official service price.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- 1. New orders MUST associate the authenticated customer as the client.
- 2. New orders MUST use the current official price of the selected active service as the authoritative order and payment amount.
- 3. Client-provided owner or authoritative price overrides MUST NOT influence persisted order values.
- 4. Inactive or unknown services MUST NOT create orders.
- 5. Order creation MUST remain an atomic marketplace action for the order, pending payment, and address snapshot when supplied.
- 6. Because `_techspec.md` is missing, any accepted optional request fields and snapshot policy MUST be confirmed during implementation without introducing negotiation or bidding behavior.
</requirements>

## Subtasks

- [ ] 04.1 Remove client control over the authoritative customer identity used for new orders.
- [ ] 04.2 Remove client control over the authoritative order and payment price.
- [ ] 04.3 Preserve validation that only active existing services can be contracted.
- [ ] 04.4 Preserve atomic creation of order-related records.
- [ ] 04.5 Add regression tests for spoofed customer IDs and manipulated prices.

## Implementation Details

The current `CreateOrderDto` exposes `clientId` and `finalPrice`, and `OrderService.create()` prefers the client price over `service.basePrice`. Narrow the creation contract to the PRD-approved behavior. Frontend payload adaptation belongs in `task_06`.

### Relevant Files

- `apps/backend/src/modules/order/order.controller.ts` — Order creation route must consume authenticated identity.
- `apps/backend/src/modules/order/order.service.ts` — Current client identity, price selection, and transaction behavior.
- `apps/backend/src/modules/order/dto/create-order.dto.ts` — Current create contract exposes spoofable fields.
- `apps/backend/src/modules/order/dto/update-order.dto.ts` — Derived DTO may inherit fields that should not remain mutable.
- `apps/backend/src/prisma/schema.prisma` — Defines service price, order price, payment amount, and address snapshot relations.

### Dependent Files

- `apps/frontend/src/app/shared/service/provider/provider.model.ts` — Current contracting payload includes `clientId` and `finalPrice`.
- `apps/frontend/src/app/shared/service/provider/provider.ts` — Sends the contracting request.
- `apps/frontend/src/app/modules/common/single-user/single-user.ts` — Builds a manipulated `finalPrice: 0` payload today.

### Related ADRs

- [ADR-001: Protect the Complete Critical Marketplace Journey](adrs/adr-001.md) — Requires platform-controlled official pricing and authenticated customer identity.

## Deliverables

- Trusted order creation based on authenticated customer identity.
- Official service price persisted as both order and payment amount.
- Narrowed order creation contract without authoritative client overrides.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for secure order creation **(REQUIRED)**

## Tests

- Unit tests:
  - [ ] Creating an order uses the authenticated customer ID.
  - [ ] A different client ID supplied by the requester cannot change the persisted customer.
  - [ ] A manipulated `finalPrice` supplied by the requester cannot change the persisted order price.
  - [ ] The pending payment amount matches the selected active service price.
  - [ ] Unknown service ID is rejected.
  - [ ] Inactive service ID is rejected.
- Integration tests:
  - [ ] Anonymous `POST /order` is rejected.
  - [ ] Authenticated customer creates an order and the returned order uses the official service price.
  - [ ] Authenticated customer cannot force a zero or altered authoritative price.
  - [ ] Order, pending payment, and address snapshot are created together when a valid address is supplied.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- Zero accepted order requests with a client-defined authoritative price.
- Customers cannot create orders under another user's identity.
- Existing active-service contracting journey remains functional.
