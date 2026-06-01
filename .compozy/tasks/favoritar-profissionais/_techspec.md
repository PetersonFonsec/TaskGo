# TechSpec — Favorites (MVP)

Date: 2026-05-30

Authors: Product, Backend, Frontend

Related: [.compozy/tasks/favoritar-profissionais/_prd.md](.compozy/tasks/favoritar-profissionais/_prd.md)

Overview

This TechSpec translates the PRD into a concrete implementation plan for the MVP favorites feature: per-client persistent favorites, a Favorites view, and a "Show only favorites" search filter. It focuses on API surface, data model, migration steps, telemetry, test plan, rollout, and rollback.

Assumptions

- Authenticated client accounts exist and are identifiable by a stable `clientId`.
- Professional/provider profiles exist and are identifiable by a stable `providerId`.
- The backend exposes listing/search endpoints that can accept additional filters.
- Team prefers a minimal data model that supports add/remove/list operations with low cost.

Design Goals

- Minimal backward-compatible changes.
- Low-latency lookups for favorites within search flows.
- Simple, auditable events for analytics.
- Feature-flagged rollout.

Data Model

Add a lightweight relation to persist favorites. Example relational schema (naming aligns with existing models):

- Table: `client_favorites`
  - `id` (PK, uuid)
  - `client_id` (FK -> clients.id, indexed)
  - `provider_id` (FK -> providers.id, indexed)
  - `created_at` (timestamp)
  - Unique constraint: (`client_id`, `provider_id`)

Notes:
- Use a compact table to allow efficient listing by `client_id` and fast existence checks by (`client_id`, `provider_id`).
- If database already has a join table for client-provider relations, reuse naming and conventions.

API Surface

Authentication: all endpoints require an authenticated client context.

Endpoints (REST-style examples)
- POST /clients/{clientId}/favorites
  - Body: { providerId }
  - Response: 201 Created | 409 Conflict
  - Idempotent: creating an existing favorite returns 200/409 with no duplication.

- DELETE /clients/{clientId}/favorites/{providerId}
  - Response: 204 No Content | 404 Not Found

- GET /clients/{clientId}/favorites
  - Query: ?limit=&offset=&sort=(created|providerName)
  - Response: { items: [{ providerId, providerSummary... }], total }

- GET /providers/{providerId}/favorited-by (admin-only or for support tooling)
  - Response: list of client ids (paginated)

Search integration
- Add optional query param to existing search endpoints: `onlyFavorites=true` (implicit clientId from auth). When present, the backend should restrict search results to providerIds from `client_favorites` for that client.

API Behaviour & Validation

- All actions validated against authenticated `clientId`.
- POST must enforce the unique constraint and return an idempotent result.
- DELETE should succeed even if the favorite doesn't exist (204) to keep UI simple, or return 404 if stricter semantics are preferred.

UI Contracts

- Professional card/profile: favorite toggle control with accessible label (e.g., "Save to favorites" / "Remove from favorites").
- Favorites view: list with provider card components and unfavorite action inline.
- Search: filter toggle "Show only favorites" persisted in user preferences if feature flag set.

Telemetry & Events

- Events to emit:
  - `favorite.add` { clientId, providerId, timestamp }
  - `favorite.remove` { clientId, providerId, timestamp }
  - `favorites.view` { clientId, resultCount }
  - `favorites.searchFilter.used` { clientId }

- Ensure events include correlation id when available for conversion tracking.

Migration Plan

1. Create migration to add `client_favorites` table with indexes and unique constraint.
2. Deploy migration in read-write mode; monitor error rate.
3. Deploy backend changes behind feature flag.
4. Deploy frontend changes behind same feature flag.
5. Gradually enable feature flag for a small % of users, monitor, then widen rollout.

Testing Plan

- Unit tests:
  - Service layer add/remove/list operations, unique constraint handling.
  - Search service when `onlyFavorites=true` filters results.

- Integration tests:
  - End-to-end API tests for add → list → delete flows.
  - UI integration test: favorite from card appears in Favorites view.

- E2E / smoke:
  - Simulate typical client flow (add 3 favorites, use filter, remove one).

Performance

- Indexes on `client_id` and (`client_id`,`provider_id`) are required to keep list and existence checks O(log n).
- If favorites volume grows, consider caching per-client providerId sets (TTL 60s) or leveraging a fast key-value store for lookups.

Security & Privacy

- Favorites are private user preferences; do not expose favorite lists to providers or third parties in MVP.
- Ensure endpoints respect auth and authorization checks; admin-only endpoints must be protected.

Feature Flagging

- Implement a backend feature flag `favorites_mvp` controlling API and search filter behavior.
- Frontend reads same flag (via config or feature flagging service) to show UI controls.

Monitoring & Alerts

- Track error rate on favorites endpoints; alert if >1% 5xxs after rollout.
- Monitor latency impact on search endpoints when `onlyFavorites` is used.
- Telemetry: adoption (unique clients using favorites), favorites add/remove rate, favorites-to-hire conversion (product metric).

Rollout & Rollback

- Rollout in stages: 5% → 25% → 100% with 24–48h observation windows.
- Rollback plan: disable feature flag and, if necessary, roll backend service that introduced breaking changes. Migration is additive; no destructive rollback needed.

Backward Compatibility

- Existing clients and providers unaffected when feature flag is off.
- API changes are additive and optional.

Open Questions

- Should favorites be retrievable cross-device for logged-out flows (e.g., local storage fallback)? (Recommended: no for MVP.)
- Is a soft-delete needed for providers so favorites survive provider soft-deactivation? Define expected behavior for unavailable providers.
- Do analytics require a denormalized favorites count on provider profiles for quick aggregation? (Consider async counters later.)

Implementation Tasks (suggested)

Backend
- Add migration for `client_favorites`.
- Implement service methods: addFavorite(clientId, providerId), removeFavorite(...), listFavorites(clientId, paging).
- Add API endpoints and integrate with search filtering.
- Add telemetry events.

Frontend
- Add favorite toggle on card and profile components (aria labels, keyboard support).
- Add Favorites view and route in client menu.
- Add search filter UX and persist preference per-user.

QA
- Implement unit, integration, and e2e tests described above.

Docs
- Add short release notes and update internal API docs for new endpoints.

Estimated Effort

- Backend: 3–5 dev days (migration, service, endpoints, tests).
- Frontend: 2–4 dev days (cards, profile, view, search filter, tests).
- QA: 1–2 days.

Appendix

- Sample SQL (Postgres):

```sql
CREATE TABLE client_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  provider_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (client_id, provider_id)
);
CREATE INDEX idx_client_favorites_client ON client_favorites (client_id);
CREATE INDEX idx_client_favorites_client_provider ON client_favorites (client_id, provider_id);
```

- Example API payloads:

POST /clients/{clientId}/favorites
{
  "providerId": "..."
}

GET /clients/{clientId}/favorites?limit=20&offset=0

Response:
{
  "items": [ { "providerId": "...", "name": "...", "shortIntro": "..." } ],
  "total": 3
}
