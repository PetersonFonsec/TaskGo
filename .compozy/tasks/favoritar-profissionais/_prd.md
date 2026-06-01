Overview

Clients need a fast way to save and later return to professionals they like. This feature adds a lightweight "favorite" affordance so clients can mark professionals, access a dedicated favorites list, and filter searches to show only favorited professionals. It reduces rediscovery friction, shortens time-to-hire, and increases repeat engagement.

Goals

- Primary: Enable clients to save professionals and retrieve them quickly; target average of 3 favorites per active client within 30 days of launch.
- Business: Increase conversion rate from favorites to hires by 10% in the first 90 days.
- Product: Deliver an MVP within one sprint with low-risk UI changes and clear success telemetry.

User Stories

- As a client, I want to mark a professional as a favorite so I can find them later.
- As a client, I want a dedicated Favorites view so I can browse my saved professionals in one place.
- As a client, I want a "Show only favorites" filter on search results so I can limit discovery to saved professionals.
- As a client, I want to remove a professional from my favorites so my list stays relevant.
- As a support agent, I want to see whether a client has favorited a professional to help troubleshoot account issues.

Core Features

- Favorite control: A simple toggle (heart/save) on professional cards and profiles to add/remove favorites.
- Favorites view: A dedicated, ordered list of a client's favorited professionals accessible from the client menu.
- Search filter: A persistent filter option on search and results pages labeled "Show only favorites" that restricts results to that client's favorites.
- Persistence: Favorites are stored per client account and persist across sessions.
- UX states: Empty-state messaging, ability to unfavorite from list and cards, and clear favorite indicators.

User Experience

- Discovery: Favorite control visible on all professional cards and profile headers; microcopy explains purpose.
- Primary flow: Client taps the favorite control → item appears in Favorites view → client can filter searches or navigate to Favorites from menu.
- Empty state: If no favorites, show guidance and CTA to save professionals from search results.
- Accessibility: Favorite controls keyboard-focusable, announced state changes to screen readers, and use color+icon for clarity.

High-Level Technical Constraints

- Favorites must be scoped to the authenticated client account and accessible within existing listing/filter flows.
- Data handling must comply with applicable privacy regulations; favorites are treated as user preferences.
- Feature should not materially degrade search/filter latency from a user perspective.

Non-Goals

- Multi-list shortlists, labels, or sharing capabilities (deferred).
- Using favorites to change global ranking or automated personalization at launch.
- Exposing favorites as provider-visible badges or public lists.

Phased Rollout Plan

MVP (Phase 1)
- Deliver favorite toggle, Favorites view, and search filter.
- Success criteria: 3 favorites per active client and working add/remove flows with no major usability issues.

Phase 2
- Add shortlists, sorting, and simple sharing for multi-user accounts.
- Success criteria: adoption of shortlists by 15% of active clients who used favorites in Phase 1.

Phase 3
- Integrate favorites into personalized recommendations and prioritized search results, with privacy review.
- Success criteria: measurable lift in conversions attributable to personalization experiments.

Success Metrics

- Primary metric: Average number of favorites per active client (target: 3 within 30 days).
- Secondary metrics: Favorites-to-hire conversion rate (% hires originating from favorites), retention uplift among clients who use favorites, and favorite add/remove event volume.

Risks and Mitigations

- Expectation gap: Users may expect sharing or cross-device features—mitigate with clear UI copy and release notes.
- UI clutter: Adding controls may confuse new users—mitigate by using a familiar, compact icon and consistent placement.
- Stale entries: Favorited professionals may deactivate—show clear empty or unavailable states and allow bulk cleanup.

Architecture Decision Records

- [.compozy/tasks/favoritar-profissionais/adrs/adr-001.md](.compozy/tasks/favoritar-profissionais/adrs/adr-001.md) — Accepts MVP approach: save + list + search filter.

Open Questions

- Should favorites be visible to providers or remain private to clients?
- Do product analytics need a dedicated event schema for favorites beyond simple add/remove counts?
- Should the Favorites view support sorting (recently favorited, most hired) in MVP or later?

Next steps: Create TechSpec from this PRD when ready.
