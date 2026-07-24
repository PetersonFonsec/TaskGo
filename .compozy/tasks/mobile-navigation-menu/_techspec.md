# Unified Adaptive Navigation

## Executive Summary

Implement one route-defined authenticated application shell for all customer, provider, general, and order routes. The shell owns the shared header, desktop navigation, mobile drawer, footer, and nested route outlet. A typed local navigation configuration supplies both responsive presentations and resolves role availability, registered links, user-specific parameters, actions, and current-page state. Destinations without registered routes are excluded until their product flows exist.

The mobile drawer uses Angular signals for local state and existing Angular CDK A11y primitives for focus containment and restoration. No API, persistence layer, or new dependency is required. The principal trade-off is a broader route hierarchy change in exchange for enforcing navigation coverage across every authenticated screen. Verification will use Cypress only, which validates real responsive behavior but provides slower and less isolated failure diagnosis than layered unit and integration tests.

## System Architecture

### Component Overview

#### `AuthenticatedShell`

A new standalone route component becomes the parent of every authenticated frontend route.

Responsibilities:

- Render `Header`, persistent desktop navigation, mobile drawer, nested `router-outlet`, and `Footer`.
- Own the drawer's open state.
- Close the drawer after successful navigation, backdrop activation, or Escape.
- Prevent public and authentication routes from rendering authenticated chrome.
- Preserve guards and public URLs while reorganizing route composition.

#### `Header`

The existing header remains responsible for branding, notifications, and profile access.

Changes:

- Add the compact-screen menu trigger.
- Receive the drawer state.
- Emit a toggle request to the shell.
- Expose `aria-expanded`, `aria-controls`, and an accessible label.
- Hide the trigger from the desktop presentation.

#### `Aside`

The existing navigation presentation becomes the shared menu-content renderer rather than the owner of navigation data.

Changes:

- Receive resolved navigation groups.
- Render the same content inside the desktop rail and mobile drawer.
- Emit link-selection and action events.
- Stop constructing logout and promotional entries internally.
- Preserve existing visual grouping.

#### `MobileNavigationDrawer`

A new standalone UI component presents shared navigation on screens narrower than 768 px.

Responsibilities:

- Render a backdrop and modal navigation surface.
- Use CDK A11y for focus containment and restoration.
- Close on backdrop activation and Escape.
- Emit selection and dismissal events.
- Complete its visual open transition within 200 ms.
- Remain absent from the accessibility tree while closed.

#### Navigation configuration

A single typed local configuration defines:

- Group identifier and visible label.
- Stable item identifier and label.
- Font Awesome icon.
- Link or application action.
- Allowed roles.
- Optional path resolver for authenticated-user parameters.
- Active-match strategy.
- Presentation metadata when a registered destination requires a distinct presentation.

For the MVP, the configuration contains only Personal Data, Addresses, and Logout. Cards, payments, security, notifications, preferences, support, professional information, bank account, earnings, and Premium are omitted because the frontend has no registered route for them. The configuration remains local because navigation does not require server data or user persistence.

#### Router composition

The Angular route hierarchy will separate public and authenticated branches:

- Public institutional and authentication routes remain outside the authenticated shell.
- Customer, provider, general, and authenticated order routes become descendants of `AuthenticatedShell`.
- Existing route URLs remain unchanged.
- Existing `unauthorizedGuard` and `permissionByRoleGuard` rules remain attached to the relevant branches or leaves.
- Current customer, provider, and general wrappers stop rendering duplicate `Page` chrome.

### Runtime Data Flow

1. The shell reads the current user from `UserLoggedService`.
2. The navigation resolver filters configuration entries by role.
3. The resolver replaces user-specific path parameters with the authenticated user ID.
4. Desktop and mobile presentations receive the same resolved groups.
5. The Router supplies current URL state for active matching.
6. The header emits a menu toggle on compact screens.
7. The shell opens the drawer and transfers focus into it.
8. A link selection requests Router navigation.
9. Successful navigation closes the drawer and restores focus appropriately.
10. An application action such as logout invokes its existing service behavior.

## Implementation Design

### Core Interfaces

Primary Angular navigation contract:

```typescript
export interface NavigationItem {
  id: string;
  label: string;
  icon: IconDefinition;
  roles: readonly RolesBack[];
  kind: 'link' | 'action';
  path?: (userId: number) => readonly unknown[];
  action?: 'logout';
  match: 'exact' | 'prefix';
}
```

Resolved group consumed by both presentations:

```typescript
export interface ResolvedNavigationGroup {
  id: string;
  label?: string;
  items: readonly ResolvedNavigationItem[];
}

export interface ResolvedNavigationItem {
  id: string;
  label: string;
  icon: IconDefinition;
  url?: UrlTree;
  action?: 'logout';
  active: boolean;
}
```

Canonical Go representation required for the primary shared type:

```go
type NavigationItem struct {
	ID     string
	Label  string
	Roles  []string
	Kind   string
	Path   string
	Action string
	Match  string
}
```

The Go type documents the configuration contract only. This frontend-only change does not add a Go service, endpoint, or persisted backend model.

### Data Models

#### Navigation configuration

- Static, immutable, and bundled with the frontend.
- Contains no authentication tokens or mutable user data.
- Uses stable IDs for selectors and state association.
- Stores route construction rules rather than hard-coded user IDs.
- Distinguishes links from actions so logout never impersonates a route.
- Contains only links backed by registered routes; unavailable destinations remain absent rather than disabled or broken.

#### Drawer state

The shell owns one boolean Angular signal:

- `false`: drawer hidden and removed from interaction.
- `true`: drawer visible, background interaction blocked, and focus contained.

No drawer state survives navigation reloads or user sessions.

#### Role resolution

- Use the role exposed by `UserLoggedService`.
- Filter before rendering either responsive presentation.
- Keep route guards authoritative for access control.
- Treat navigation filtering as presentation behavior, not authorization.

#### Active route resolution

- Exact matching applies to leaf destinations that should represent only one URL.
- Prefix matching applies to destinations with child screens.
- Active links expose `aria-current="page"`.
- Selection includes a non-color visual indicator.
- Dynamic URLs compare against the resolved authenticated-user path.

### API Endpoints

No API endpoint is added or modified.

Navigation configuration is static, and the current user already comes from `UserLoggedService`. Adding a server dependency would increase latency and failure modes without satisfying an MVP requirement.

### Storage

No database, browser storage key, cookie, or cache entry is added.

The mobile drawer always starts closed. Navigation content derives from application configuration and the current authenticated user.

## Integration Points

### Angular Router

- Hosts the authenticated shell as a parent route.
- Preserves existing public URLs.
- Supplies nested content through `router-outlet`.
- Drives active-link state and successful-navigation dismissal.
- Retains existing guards on protected branches and order routes.

### `UserLoggedService`

- Supplies authenticated user ID and role.
- Continues to own logout behavior.
- Requires no contract change.
- Must remain compatible with SSR and existing browser checks.

### Angular CDK A11y

- Provides focus containment for the open drawer.
- Supports initial focus placement and restoration.
- Uses the package already installed in the frontend.
- Introduces no additional dependency.

### Existing responsive system

- Reuse the shared `$tablet: 768px` breakpoint.
- Show the mobile trigger and drawer below 768 px.
- Show persistent desktop navigation from 768 px upward.
- Avoid introducing a competing breakpoint.

## PRD Traceability

| PRD requirement | Technical owner |
|---|---|
| Navigation on every authenticated screen | `AuthenticatedShell` and authenticated route branch |
| Same available destinations across devices | Typed navigation configuration limited to registered routes |
| Role-appropriate availability | Navigation resolver plus existing route guards |
| One-action mobile discovery | Header menu trigger |
| Visible desktop navigation | Persistent shell navigation region |
| Current-location feedback | Router-based active matching and `aria-current` |
| Close after selection | Shell navigation-event handling |
| Backdrop and Escape dismissal | `MobileNavigationDrawer` |
| Keyboard and assistive-technology support | CDK A11y, ARIA state, focus restoration |
| Correct user destinations | User-aware path resolver |
| No horizontal mobile overflow | Drawer and shell responsive styles |
| Immediate opening | Local signal state and transition of at most 200 ms |

## Impact Analysis

| Component | Impact Type | Description and risk | Required action |
|---|---|---|---|
| Application routes | Modified | High: route nesting can affect guards and redirects | Add authenticated parent while preserving paths and guard behavior |
| `AuthenticatedShell` | New | Medium: becomes shared chrome boundary | Compose navigation, content outlet, state, and footer |
| `Page` | Deprecated or reduced | Medium: current wrappers depend on it | Remove duplicate chrome usage after route migration |
| `Header` | Modified | Low: gains mobile trigger and state contract | Add accessible toggle inputs and output |
| `Aside` | Modified | Medium: data ownership changes | Render supplied groups and emit selections |
| `MobileNavigationDrawer` | New | Medium: modal focus and dismissal behavior | Add responsive surface, backdrop, and CDK focus handling |
| Navigation configuration | Modified | High: stale URLs, missing routes, and fixed user ID exist | Keep only registered destinations and introduce typed role-aware path resolvers |
| `AsideListItem` | Modified | Medium: exact-only active matching is insufficient | Support exact or prefix matching and `aria-current` |
| Customer/provider/general wrappers | Modified | Medium: currently render shared `Page` | Retain feature outlets without duplicate layout |
| Order routes | Modified | High: currently bypass shared layout | Nest under authenticated shell and retain guards |
| Cypress support selectors | Modified | Low: selectors already anticipate a menu trigger | Add stable accessible drawer selectors |
| Legacy menu Cypress suite | Superseded | Low: existing scenario is skipped | Add a focused, non-skipped adaptive navigation suite |

## Testing Approach

### Unit Tests

No feature-specific Jasmine unit tests will be added, per ADR-003.

Trade-off:

- Typed configuration filtering and drawer state branches will only receive coverage through browser flows.
- Failures will take longer to isolate than focused component tests.
- TypeScript compilation still provides static contract validation.

### Integration Tests

No Angular TestBed or RouterTestingHarness integration tests will be added, per ADR-003.

Route composition, guards, active state, and shell coverage will instead be exercised through direct browser navigation.

### Cypress End-to-End Tests

Create a dedicated, non-skipped adaptive-navigation specification covering:

#### Mobile viewport below 768 px

- The persistent rail is hidden.
- The header menu trigger is visible.
- One activation opens the complete drawer.
- `aria-expanded` and drawer visibility reflect the open state.
- Focus moves into the drawer.
- Tab and Shift+Tab remain within the drawer.
- Escape closes the drawer and restores trigger focus.
- Backdrop activation closes the drawer.
- Selecting a valid destination navigates and closes the drawer.
- The selected destination exposes `aria-current="page"` and a non-color indicator.
- A child route activates its prefix-matched parent destination.
- Opening completes within 200 ms without a network request.

#### Desktop viewport at or above 768 px

- The persistent navigation is visible.
- The mobile trigger and drawer are absent.
- Every permitted destination remains accessible.
- Active-state behavior matches mobile.
- Existing content width and navigation width do not regress.

#### Role and route coverage

- Customer users see only permitted customer/common entries.
- Provider users see only permitted provider/common entries.
- Unsupported items are absent rather than merely disabled.
- Route guards continue to reject unauthorized direct entry.
- Corrected profile and address links use the authenticated user ID.
- Every rendered link reaches a registered route.
- Destinations without registered routes are absent on both responsive presentations.
- Direct entry to each authenticated order route includes the shell navigation.
- Public and authentication routes do not display authenticated chrome.
- Logout invokes the current service flow.

#### Performance assertion

- Capture browser time immediately before activation.
- Detect the open state through a stable drawer attribute or class.
- Assert elapsed time is no greater than 200 ms.
- Do not use fixed sleeps.
- Run the measurement after the page is stable to reduce environmental noise.

## Development Sequencing

### Build Order

1. Create the typed navigation configuration and user-aware path resolver — no dependencies.
2. Correct destinations, role metadata, and active-match rules — depends on step 1.
3. Refactor `Aside` and `AsideListItem` to consume resolved configuration — depends on steps 1 and 2.
4. Add the accessible mobile drawer using Angular CDK A11y — depends on step 3.
5. Extend `Header` with the mobile trigger contract — depends on step 4.
6. Create `AuthenticatedShell` and connect signal state, header, desktop navigation, drawer, footer, and outlet — depends on steps 3, 4, and 5.
7. Reorganize authenticated routes beneath the shell and remove duplicate wrapper chrome — depends on step 6.
8. Add stable Cypress selectors and fixtures for each supported role — depends on steps 2 through 7.
9. Implement mobile, desktop, accessibility, authorization, order-route, and timing scenarios — depends on step 8.
10. Run the focused Cypress suite, complete frontend Cypress suite, and production build — depends on step 9.

### Technical Dependencies

- Existing Angular 21 standalone component model.
- Existing Angular Router and route guards.
- Existing Angular CDK A11y package.
- Existing `UserLoggedService` user ID, role, and logout behavior.
- Existing shared SCSS breakpoint variables.
- Cypress browser environment with authenticated fixtures for customer and provider roles.
- A stable target route for every configured menu item.

No backend delivery or external service is required.

## Monitoring and Observability

The MVP adds no production telemetry because baseline measurement and observation duration remain open PRD questions.

Verification visibility will come from:

- Cypress assertions for route coverage, responsive state, focus behavior, and opening time.
- Existing frontend error and tracing infrastructure for unexpected routing failures.
- Manual review of mobile-navigation support reports after rollout.

Future analytics must be separately approved before capturing menu interaction events. No user-identifying navigation telemetry is introduced in this delivery.

## Technical Considerations

### Key Decisions

- **Authenticated route shell:** guarantees layout coverage instead of relying on individual page wrappers.
- **Single typed configuration:** prevents desktop/mobile drift and centralizes role availability.
- **Static local data:** avoids unnecessary API, storage, and loading states.
- **Angular signals:** keeps drawer state local and synchronous.
- **Angular CDK A11y:** supplies focus behavior without a new dependency.
- **Correct routes during delivery:** ensures the new navigation does not reproduce known invalid paths.
- **Hide unimplemented destinations:** prevents broken navigation without expanding this feature into unrelated page implementations.
- **Cypress-only verification:** prioritizes real-browser confidence over isolated diagnosis.
- **200 ms transition ceiling:** provides a concrete user-perceived performance boundary.

### Known Risks

#### Route hierarchy regressions

Likelihood: medium.  
Impact: high.

Mitigation:

- Preserve URLs and existing guard placement.
- Cover direct route entry, redirects, and denied access in Cypress.
- Verify order routes explicitly because they currently bypass shared layout.

#### Configuration and guard drift

Likelihood: medium.  
Impact: high.

Mitigation:

- Keep route guards authoritative.
- Exercise each supported role and denied-route scenario.
- Document role metadata next to every navigation entry.

#### Focus-management defects

Likelihood: medium.  
Impact: high for keyboard and assistive-technology users.

Mitigation:

- Use existing CDK primitives.
- Test initial focus, containment, Escape, and restoration through Cypress keyboard flows.

#### Cypress-only diagnostic limitations

Likelihood: high.  
Impact: medium.

Mitigation:

- Keep scenarios focused and use stable accessible selectors.
- Separate role, responsive, routing, and accessibility contexts.
- Avoid fixed waits and ambiguous DOM selectors.

#### Performance-test variability

Likelihood: medium.  
Impact: medium.

Mitigation:

- Assert a deterministic open-state signal.
- Avoid network activity and fixed sleeps.
- Run after the application is stable.
- Record measured elapsed time in failure output.

#### SSR and hydration behavior

Likelihood: low.  
Impact: medium.

Mitigation:

- Avoid browser-global access in component initialization.
- Derive initial drawer state as closed.
- Follow existing platform checks when browser-only behavior is unavoidable.

## Architecture Decision Records

- [ADR-001: Adopt Unified Adaptive Navigation](adrs/adr-001.md) — Preserve one navigation experience while adapting its presentation to screen size.
- [ADR-002: Centralize Authenticated Navigation in an Adaptive Shell](adrs/adr-002.md) — Place all authenticated routes under one shell backed by typed navigation and an accessible mobile drawer.
- [ADR-003: Verify Adaptive Navigation with Cypress End-to-End Tests](adrs/adr-003.md) — Use browser-level mobile and desktop scenarios as the mandatory verification layer.
