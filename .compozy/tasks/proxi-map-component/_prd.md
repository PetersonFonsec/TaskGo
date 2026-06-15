# PRD: Proxi Search Map Component

## Overview

Proxi needs a map experience that helps customers understand where nearby service providers are located while preserving the provider list as the primary comparison surface. The feature serves customers searching for local services and helps them evaluate proximity alongside price, rating, trust, and service fit.

The map should support mobile and desktop users. On desktop, it should work as part of a split search layout. On mobile, it should remain compact or expandable so it adds location context without pushing the provider list out of focus.

## Goals

- Help customers understand provider proximity during search.
- Increase confidence when choosing nearby providers.
- Preserve the provider list as the main decision surface.
- Support mobile and desktop layouts without requiring a separate search flow.
- Provide a clear path from map marker to provider profile.

## User Stories

- As a customer, I want to see nearby providers on a map so that I can understand which options are closest to me.
- As a customer, I want to see my own location on the map so that provider distance has clear context.
- As a customer, I want provider markers to show key details so that I can decide whether to view a profile.
- As a customer, I want premium and verified providers to stand out so that I can recognize trust signals quickly.
- As a customer on mobile, I want the map to be compact so that I can keep browsing the provider list comfortably.
- As a customer on desktop, I want list and map context together so that I can compare providers faster.

## Core Features

### Nearby Provider Map

The search experience includes a map centered around the customer location. It shows the customer location and all providers returned by the current search.

### Provider Markers

Each provider appears as a marker. Provider markers should use Proxi's purple visual identity and should visually distinguish premium or verified providers when that data is available.

### Customer Location Marker

The customer location appears as a distinct marker. It must be visually different from provider markers so users can orient themselves quickly.

### Provider Popup

Each provider marker opens a popup with the provider name, service, rating, distance when available, starting price, premium or verified indicators when available, and a clear "View profile" action.

### Profile Intent

The map does not own provider navigation. It communicates the user's intent to view a profile to the parent search experience.

### Automatic Map Framing

The map should automatically frame the visible providers and user location so that users do not need to manually search the map after results load or change.

### Empty State

When no providers are available, the map should still show the customer location and the page should display a discreet message outside the map explaining that no providers were found for the current search.

### Responsive Experience

Desktop should support a split list and map experience. Mobile should use a compact or expandable map that keeps the provider list easy to scan.

## User Experience

1. The customer opens the service search screen.
2. The page shows providers in the list and displays the map as supporting context.
3. The map centers around the customer and frames visible provider results.
4. The customer taps or clicks a provider marker.
5. The popup displays provider details and trust cues.
6. The customer selects "View profile".
7. The parent search experience opens the provider profile.
8. If results change, the map updates to match the current provider list.

Accessibility requirements:

- The profile action must have an accessible label.
- Empty, loading, and unavailable-location states must be understandable without relying only on the map.
- The experience must remain usable if the map fails to load.

## High-Level Technical Constraints

- The map must use Leaflet with OpenStreetMap tiles.
- Google Maps is out of scope.
- OpenStreetMap attribution must be visible.
- The frontend must include Leaflet's stylesheet through the Angular workspace configuration.
- The experience must work in modern mobile and desktop browsers.
- Provider location depends on existing latitude and longitude data.
- The component must support updates when the current provider list changes.

## Non-Goals (Out of Scope)

- Turn search into a map-first product experience.
- Add route planning or turn-by-turn navigation.
- Add provider clustering in the MVP.
- Add drawing, radius editing, or geofence management.
- Replace the provider list with the map.
- Add Google Maps support.
- Add backend changes for provider location storage.

## Phased Rollout Plan

### MVP (Phase 1)

- Show customer location and provider markers.
- Show provider popup with core decision details.
- Support profile intent from popup.
- Support empty state and unavailable-location state.
- Support responsive mobile and desktop behavior.
- Include OpenStreetMap attribution.

Success criteria:

- Customers can understand nearby provider locations during search.
- Customers can open provider profiles from the map.
- The map does not reduce usability of the provider list on mobile.

### Phase 2

- Add better visual treatment for premium and verified providers.
- Improve expanded mobile map behavior.
- Add result count and selected-provider synchronization between list and map.

### Phase 3

- Explore clustering, radius filters, and richer map-based discovery if usage data supports it.

## Success Metrics

- Increase in provider profile views from search.
- Increase in profile views for nearby providers.
- Stable or improved mobile search engagement.
- Low rate of map load failures.
- No measurable drop in list interaction after map introduction.
- Positive qualitative feedback on proximity clarity.

## Risks and Mitigations

- Risk: The map competes with the provider list on mobile.
  Mitigation: Keep the mobile map compact or expandable.

- Risk: Users over-prioritize distance over quality.
  Mitigation: Show rating, price, verification, and premium cues in popups.

- Risk: Empty results make the map feel broken.
  Mitigation: Show the user marker and a clear message outside the map.

- Risk: OpenStreetMap tile policy or attribution requirements are missed.
  Mitigation: Require visible attribution and responsible tile usage.

## Architecture Decision Records

- [ADR-001: Hybrid Search Map Experience](adrs/adr-001.md) - The provider list remains primary, with the map acting as proximity context across desktop and mobile.

## Open Questions

- Final copy for empty and unavailable-location states needs product wording.
- The exact desktop split ratio and mobile compact height should be finalized during design.
- Provider marker visual hierarchy for premium versus verified needs design confirmation.
