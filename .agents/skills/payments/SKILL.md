---
name: payments
description: Use when implementing, debugging, testing, or reviewing TaskGo checkout, PIX/card payments, Pagar.me integration, webhooks, fees, splits, refunds, or reconciliation.
---

# TaskGo Payments

The real gateway is Pagar.me. `apps/backend/src/modules/payments` uses Nest CQRS, `PagarmeService`, payment DTOs/mappers, Prisma `Payment`/`PaymentWebhookEvent`, PIX and card flows, provider recipients, platform/provider fee split, and simulation config. Orders and timeline events are coupled to payment state transitions.

- Treat amount, fee, recipient eligibility, ownership, and payable order status as server-authoritative. Keep money in integer cents at gateway boundaries and preserve Prisma Decimal semantics.
- Reuse an existing compatible payment instead of duplicating it. Make retries and concurrent submissions idempotent with provider IDs/unique constraints and transactions.
- Webhooks are public: validate the provider's authenticity mechanism before trusting payloads, persist each event once, tolerate duplicates/out-of-order events, acknowledge safely, and avoid leaking payload data.
- Model explicit state transitions and timestamps for authorization, payment, capture, release, failure, cancel, and refund. Keep Order, Payment, and OrderTimeline atomic where required.
- Never log card details, credentials, or raw sensitive responses. Do not expose provider payloads publicly.
- Plan timeout/retry policy and reconciliation for ambiguous provider outcomes; do not silently retry non-idempotent calls.

Test gateway success/failure, ownership, invalid state, duplicate webhook, race behavior, fee fallback, and rollback. Never invent Stripe or subscriptions.
