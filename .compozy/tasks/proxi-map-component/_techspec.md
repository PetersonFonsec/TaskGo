# TechSpec: Proxi Search Map Component

## Executive Summary

Implement a reusable Angular standalone `ProxiMapComponent` in the frontend shared UI layer and integrate it into the customer search page. The component will render Leaflet with OpenStreetMap tiles, receive a normalized provider list and user location through inputs, emit provider profile intent through an output, and keep all Leaflet lifecycle work internal.

The primary technical trade-off is SSR safety versus implementation simplicity. Because the Angular app has server-side rendering configured, the design uses browser-only dynamic Leaflet loading after view initialization instead of static imports. This adds lifecycle complexity but prevents DOM-dependent Leaflet code from running during server rendering.

## System Architecture

### Component Overview

- `ProxiMapComponent`
  - Location: `apps/frontend/src/app/shared/components/ui/proxi-map`
  - Standalone Angular UI component.
  - Owns Leaflet map initialization, marker rendering, popup rendering, bounds calculation, and cleanup.
  - Accepts normalized provider and user-location inputs.
  - Emits `viewProfile` with provider id.
  - Does not fetch data and does not navigate.

- `Search`
  - Location: `apps/frontend/src/app/modules/customer/search`
  - Adapts current provider API response into `ProxiMapProvider[]`.
  - Resolves or passes the current user location.
  - Handles `viewProfile` by navigating to `/customer/:id`.
  - Integrates the map into the hybrid search layout.

- `angular.json`
  - Adds Leaflet CSS to build and test styles.
  - Adds Leaflet CSS to Storybook styles if Storybook coverage is desired for the component.

- `package.json`
  - Adds runtime dependency `leaflet`.
  - Adds dev dependency `@types/leaflet`.

## Implementation Design

### Core Interfaces

```ts
export interface ProxiMapLocation {
  lat: number;
  lng: number;
}

export interface ProxiMapProvider {
  id: number | string;
  name: string;
  service: string;
  rating: number;
  priceFrom: number;
  lat: number;
  lng: number;
  distanceKm?: number;
  photoUrl?: string;
  premium?: boolean;
  verified?: boolean;
}
```

```ts
@Component({
  selector: 'app-proxi-map',
  standalone: true,
  templateUrl: './proxi-map.component.html',
  styleUrl: './proxi-map.component.scss',
})
export class ProxiMapComponent {
  readonly providers = input<ProxiMapProvider[]>([]);
  readonly userLocation = input<ProxiMapLocation | null>(null);
  readonly viewProfile = output<ProxiMapProvider['id']>();
}
```

### Data Models

`ProxiMapProvider` is a UI-facing contract owned by the map component. It should not mirror the backend provider response directly.

Provider mapping in the search page should:

- Convert provider id to the map contract id.
- Prefer provider user name for `name`.
- Use service or category display data for `service` when available.
- Normalize decimal or missing rating values into a number.
- Normalize starting price into `priceFrom`.
- Filter providers without valid numeric latitude and longitude.
- Preserve premium and verified flags when available.

### API Endpoints

No new API endpoints are required.

The existing provider search integration remains responsible for fetching providers:

- `GET /provider/by-category/:categorySlug`
- Optional query param: `onlyFavorites=true`

The map consumes already-fetched data from the search page.

## Integration Points

### Leaflet and OpenStreetMap

- Install `leaflet` and `@types/leaflet`.
- Load Leaflet dynamically in the browser after `AfterViewInit`.
- Use OpenStreetMap tile URL with visible attribution.
- Use custom `divIcon` markers instead of default image markers where possible.
- Still account for default marker asset issues if any Leaflet default icon is used.

### Angular SSR Boundary

- Guard all Leaflet imports and map initialization with `isPlatformBrowser`.
- Do not access `window`, `document`, `navigator`, or Leaflet APIs during server rendering.
- Render a non-interactive fallback container when the component is server-rendered or map initialization fails.

### Customer Search Page

- Import `ProxiMapComponent` into `Search`.
- Add computed/adapted map provider data.
- Provide user location when available.
- Handle `(viewProfile)` by routing to `/customer/:id`.
- Update SCSS for split desktop layout and compact mobile map layout.

## Impact Analysis

| Component | Impact Type | Description and Risk | Required Action |
|-----------|-------------|----------------------|-----------------|
| `apps/frontend/package.json` | modified | Adds Leaflet dependencies; low risk | Add `leaflet` and `@types/leaflet` |
| `apps/frontend/angular.json` | modified | Adds Leaflet CSS to Angular build/test styles; low risk | Add `node_modules/leaflet/dist/leaflet.css` |
| `shared/components/ui/proxi-map` | new | New reusable map component; medium risk due to DOM lifecycle | Create TS, HTML, SCSS, and spec files |
| `modules/customer/search/search.ts` | modified | Maps provider data and handles profile navigation; medium risk due to current `any` provider shape | Add adapter and event handler |
| `modules/customer/search/search.html` | modified | Adds map component to search page; medium risk for layout | Add responsive map placement |
| `modules/customer/search/search.scss` | modified | Adds desktop split and mobile compact layout; medium risk for UX | Update responsive styles |
| `Geolocalization` service | reused | Existing browser-safe location provider; low risk | Use from search page if user location is not already available |

## Testing Approach

### Unit Tests

- `ProxiMapComponent`
  - Creates without initializing Leaflet on non-browser platform.
  - Initializes Leaflet on browser platform after view init.
  - Renders user marker and provider markers.
  - Rebuilds markers when providers change.
  - Emits `viewProfile` when popup action is triggered.
  - Removes the map in `ngOnDestroy`.
  - Handles empty provider list with only the user marker.

- `Search`
  - Maps raw providers into `ProxiMapProvider[]`.
  - Filters invalid coordinates.
  - Navigates to `/customer/:id` on `viewProfile`.
  - Preserves existing favorites behavior.

Mock Leaflet at the module boundary so tests do not require real map rendering.

### Integration Tests

No backend integration test is required for MVP because the map uses existing provider search data.

Optional follow-up:

- Add a Cypress path that opens search, verifies the map container exists, and checks profile navigation from a controlled map interaction. This is not required in the first implementation.

## Development Sequencing

### Build Order

1. Add Leaflet dependencies and Angular stylesheet configuration - no dependencies.
2. Create `ProxiMapComponent` shell with typed inputs/outputs - depends on step 1.
3. Add browser-only dynamic Leaflet initialization and OpenStreetMap tile layer - depends on step 2.
4. Add custom markers, popups, profile event bridging, and bounds recalculation - depends on step 3.
5. Add component cleanup and marker update lifecycle - depends on step 4.
6. Add component unit tests with Leaflet mocks - depends on steps 2 through 5.
7. Integrate the component into `customer/search` with provider mapping and profile navigation - depends on step 4.
8. Add search page unit tests for mapping and navigation - depends on step 7.
9. Update search SCSS for desktop split layout and mobile compact map - depends on step 7.
10. Run frontend tests and build validation - depends on steps 1 through 9.

### Technical Dependencies

- `leaflet` runtime package.
- `@types/leaflet` dev package.
- Valid provider latitude and longitude in the existing provider search response.
- A user location source from existing app state or `Geolocalization`.

## Monitoring and Observability

No new application monitoring is required for MVP.

Client-side errors during map initialization should be handled locally with a visible fallback state. If the app has a central notification or logging utility available during implementation, map initialization failures may be logged with:

- component: `ProxiMapComponent`
- event: `map_init_failed`
- providerCount
- hasUserLocation

## Technical Considerations

### Key Decisions

- Decision: Place the component under `shared/components/ui/proxi-map`.
  - Rationale: The component is reusable and should not own customer search routing.
  - Trade-off: The search page must adapt data into the component contract.
  - Alternatives rejected: search-local component and global functional service abstraction.

- Decision: Dynamically import Leaflet only in the browser.
  - Rationale: Angular SSR is configured and Leaflet depends on browser DOM APIs.
  - Trade-off: Tests and lifecycle code are slightly more complex.
  - Alternatives rejected: static imports and disabling SSR for search.

- Decision: Use local exported interfaces for map provider data.
  - Rationale: Keeps the component stable and independent from backend response shape.
  - Trade-off: The search page owns mapping logic.
  - Alternatives rejected: raw provider response and premature global map model.

### Known Risks

- Risk: Leaflet initializes before the container has a final size.
  - Mitigation: Call `invalidateSize()` after initialization and after responsive state changes when needed.

- Risk: Provider response lacks a consistent service, rating, or price field.
  - Mitigation: Use defensive mapping and safe fallbacks in the search page.

- Risk: Default Leaflet marker assets break under Angular bundling.
  - Mitigation: Use custom `divIcon` markers for user and provider markers.

- Risk: OpenStreetMap attribution is omitted.
  - Mitigation: Configure tile layer attribution explicitly.

- Risk: SSR platform mismatch.
  - Mitigation: Keep all Leaflet imports and DOM operations inside browser-only lifecycle code.

## Architecture Decision Records

- [ADR-001: Hybrid Search Map Experience](adrs/adr-001.md) - The provider list remains primary, with the map acting as proximity context across desktop and mobile.
- [ADR-002: Shared UI Component with Browser-Only Leaflet Loading](adrs/adr-002.md) - The map is a reusable standalone UI component that loads Leaflet only in the browser.
- [ADR-003: Local Map Provider Contract and Search Page Adaptation](adrs/adr-003.md) - The map owns a small UI-facing provider contract, and search adapts backend data into it.
