# TechSpec: Provider Schedule Booking Screen

## Executive Summary

Implement a provider booking experience on the existing `customer/:userId` route. The page will let a customer view provider details, select an available date and time, review the appointment summary, and submit a scheduled order.

The primary technical trade-off is adding a backend availability endpoint before completing the UI. This adds backend scope, but it keeps slot calculation and conflict prevention authoritative on the server instead of duplicating scheduling rules in Angular.

## System Architecture

### Component Overview

- `ProviderController`
  - Location: `apps/backend/src/modules/provider/provider.controller.ts`
  - Adds a public availability read endpoint for provider profile booking.
  - Accepts provider id, optional service id, and date range query params.

- `ProviderService`
  - Location: `apps/backend/src/modules/provider/provider.service.ts`
  - Builds available slots from active services and their `availability` JSON.
  - Removes slots already used by pending or confirmed orders.

- `OrderService`
  - Location: `apps/backend/src/modules/order/order.service.ts`
  - Validates `scheduledFor` against provider availability before creating scheduled orders.
  - Continues to create the order through the existing `POST /order` endpoint.

- `Provider` frontend service
  - Location: `apps/frontend/src/app/shared/service/provider/provider.ts`
  - Adds a typed availability request method and keeps `hireProvider` as the order creation call.

- `SingleUser`
  - Location: `apps/frontend/src/app/modules/common/single-user`
  - Evolves the provider profile into a booking screen with calendar, time slot selector, summary, and confirmation modal.

## Implementation Design

### Core Interfaces

```go
type ProviderAvailabilitySlot struct {
  StartsAt string `json:"startsAt"`
  EndsAt string `json:"endsAt"`
  ServiceId string `json:"serviceId"`
  Available bool `json:"available"`
}
```

```ts
export interface ProviderAvailabilityResponse {
  providerId: string;
  timezone: string;
  days: ProviderAvailabilityDay[];
}

export interface ProviderAvailabilityDay {
  date: string;
  available: boolean;
  slots: ProviderAvailabilitySlot[];
}

export interface ProviderAvailabilitySlot {
  startsAt: string;
  endsAt: string;
  serviceId: string;
  label: string;
  available: boolean;
}
```

### Data Models

- `Service.availability`
  - Existing JSON field used as the source of provider working rules.
  - MVP expected shape should support weekday keys and time ranges.

- `Order.scheduledFor`
  - Existing `DateTime` used to store the selected appointment time.
  - Pending and confirmed orders block matching slots for the same provider service.

- `CreateOrderDto.scheduledFor`
  - Existing ISO8601 optional field.
  - Becomes required by the customer booking UI before submitting an appointment request.

### API Endpoints

- `GET /provider/:id/availability`
  - Query params:
    - `from`: required `YYYY-MM-DD`
    - `to`: required `YYYY-MM-DD`
    - `serviceId`: optional service id; defaults to the provider's first active service when absent
  - Response: `ProviderAvailabilityResponse`
  - Behavior:
    - Returns only slots derived from active services.
    - Excludes slots with conflicting `Order.scheduledFor` in `PENDENTE` or `CONFIRMADO`.
    - Returns empty `days` or unavailable days when the provider has no configured availability.

- `POST /order`
  - Existing endpoint.
  - Request includes `scheduledFor`.
  - Behavior:
    - Validates that the requested datetime is still available before creating the order.
    - Returns `400 Bad Request` when the slot is not available.

## Integration Points

- Angular route `customer/:userId` remains unchanged and continues loading `SingleUser`.
- Provider lookup remains `User.getProvider(userId)`.
- Appointment creation remains `Provider.hireProvider(payload)`.
- Availability uses a new `Provider.getAvailability(providerId, query)` frontend method.

## Impact Analysis

| Component | Impact Type | Description and Risk | Required Action |
|-----------|-------------|----------------------|-----------------|
| `ProviderController` | modified | Adds availability endpoint; medium risk because route order already contains `:id` and `by-category` routes | Add endpoint before generic `:id` route |
| `ProviderService` | modified | Adds slot calculation and conflict filtering; high risk around date boundaries | Implement availability helper methods with tests |
| `OrderService` | modified | Validates scheduled orders before create; medium risk to current order flow | Add guard for `scheduledFor` only |
| `provider.model.ts` | modified | Adds typed availability contracts; low risk | Export interfaces |
| `Provider` frontend service | modified | Adds HTTP availability method; low risk | Add typed method |
| `SingleUser` | modified | Replaces direct hire CTA with booking UI; high risk due to page layout and state | Add calendar, slots, summary, submit states |
| `single-user.spec.ts` | modified | Existing tests need appointment mocks; medium risk | Expand mocks and assertions |

## Testing Approach

### Unit Tests

- `ProviderService`
  - Returns slots for active provider services within a date range.
  - Excludes slots occupied by `PENDENTE` and `CONFIRMADO` orders.
  - Keeps slots available when conflicting orders are `CANCELADO` or `CONCLUIDO`.
  - Handles missing or malformed `availability` JSON by returning unavailable days.

- `OrderService`
  - Creates an order when `scheduledFor` matches an available slot.
  - Rejects an order when `scheduledFor` is unavailable or already occupied.
  - Preserves existing unscheduled order behavior when `scheduledFor` is omitted outside the booking UI.

- `SingleUser`
  - Loads provider and availability data.
  - Selects a date and slot.
  - Sends `scheduledFor` in `hireProvider`.
  - Disables submit until a slot is selected.
  - Shows an empty state when no slots exist.

### Integration Tests

- Backend controller tests for `GET /provider/:id/availability`.
- Frontend component integration test that renders provider details, slot options, and appointment summary.

## Development Sequencing

### Build Order

1. Define availability DTOs and provider service contracts - no dependencies.
2. Implement backend availability calculation in `ProviderService` - depends on step 1.
3. Expose `GET /provider/:id/availability` in `ProviderController` - depends on step 2.
4. Add scheduled order availability validation in `OrderService` - depends on step 2.
5. Add frontend availability models and `Provider.getAvailability` - depends on step 3.
6. Update `SingleUser` state and booking submission flow - depends on steps 4 and 5.
7. Build responsive booking UI in `single-user.html` and `single-user.scss` - depends on step 6.
8. Add backend and frontend tests - depends on steps 2 through 7.
9. Run validation, frontend tests, and backend tests - depends on step 8.

### Technical Dependencies

- Existing `Service.availability` data must be normalized or documented.
- Existing order statuses must be used to decide which orders block slots.
- The app must consistently use one timezone for MVP slot generation.

## Monitoring and Observability

- Log availability request failures with provider id, from date, to date, and service id.
- Track booking submission failures caused by unavailable slots.
- Optional product telemetry:
  - `booking.availability.viewed`
  - `booking.slot.selected`
  - `booking.request.created`
  - `booking.slot.unavailable`

## Technical Considerations

### Key Decisions

- Decision: Backend owns availability slots.
  - Rationale: Slot calculation needs existing orders and must prevent conflicts.
  - Trade-offs: Adds backend scope before the UI is complete.
  - Alternatives rejected: frontend-only slot calculation and mocked visual-only schedule.

- Decision: Reuse `POST /order` for appointment creation.
  - Rationale: The backend already has order creation, payment snapshot, address snapshot, and `scheduledFor`.
  - Trade-offs: `OrderService` gains scheduling validation responsibility.
  - Alternatives rejected: separate booking endpoint for MVP.

- Decision: Keep `customer/:userId` route.
  - Rationale: Search and map already navigate to this provider profile route.
  - Trade-offs: `SingleUser` becomes a richer booking page instead of a simple profile view.
  - Alternatives rejected: new route such as `customer/:id/book`.

### Known Risks

- Risk: `Service.availability` has inconsistent shape.
  - Mitigation: Add parser guards, empty states, and tests for malformed values.

- Risk: Route ordering in `ProviderController` can shadow specific routes.
  - Mitigation: Place `availability` and `by-category` routes before generic `:id` when implementing.

- Risk: Timezone conversion shifts selected slots.
  - Mitigation: Return ISO datetimes and display the configured timezone in the UI summary.

- Risk: Two clients request the same slot at the same time.
  - Mitigation: Recheck availability inside `OrderService.create` immediately before persistence.

## Architecture Decision Records

- [ADR-001: Provider Availability Slots as Backend Source of Truth](adrs/adr-001.md) - The backend owns slot calculation and conflict filtering while the frontend renders the returned availability contract.
