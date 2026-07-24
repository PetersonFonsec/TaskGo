# Unified Adaptive Navigation

## Overview

Authenticated TaskGo users can access account navigation through a persistent sidebar on larger screens. On mobile screens, this sidebar is hidden and no equivalent navigation is available, preventing users from moving reliably between account areas.

This feature provides all authenticated users with consistent access to the same available navigation destinations and account actions on every authenticated screen. A destination is available only when the application has a registered route for it. The navigation presentation adapts to the available screen size while preserving labels, grouping, ordering, availability, and current-location feedback.

## Goals

- Make every navigation destination available on all authenticated mobile screens.
- Allow users to open the complete navigation quickly from any authenticated screen.
- Preserve a consistent information structure across mobile and desktop.
- Clearly communicate the user's current location.
- Preserve access rules applicable to each authenticated user.
- Prevent navigation improvements from reducing desktop discoverability.

## User Stories

- As an authenticated mobile user, I want to open the complete navigation from any screen so that I can move between account areas without returning home.
- As an authenticated user, I want navigation labels and groups to remain consistent across devices so that I do not need to relearn the product.
- As a customer, I want access to every implemented account destination and logout action available to me.
- As a service provider, I want the navigation to hide destinations that are not implemented so that I never enter a broken flow.
- As a user, I want to see my current destination highlighted so that I understand where I am.
- As a keyboard or assistive-technology user, I want the navigation to be operable and understandable without relying on visual cues alone.

## Core Features

### Complete authenticated navigation

- Make all registered destinations and valid account actions available on mobile.
- Preserve destination labels, grouping, and order across screen sizes.
- Show only destinations available to the authenticated user.
- Hide destinations without registered routes from both desktop and mobile navigation.
- Include logout as the only currently valid non-route account action.

### Adaptive presentation

- Keep navigation directly visible on screens with sufficient space.
- Provide a clearly identifiable navigation control on compact screens.
- Display the complete navigation after the mobile user activates that control.
- Avoid permanently occupying mobile content space with the full menu.

### Universal availability

- Provide access to navigation from every authenticated screen.
- Keep the navigation control in a predictable location.
- Allow users to move directly from their current screen to any available destination.

### Orientation and feedback

- Identify the currently selected destination.
- Provide clear feedback when the mobile navigation opens and closes.
- Close the mobile navigation after the user selects a destination.
- Let users dismiss the mobile navigation without leaving their current screen.

### Accessible interaction

- Give the navigation control a clear accessible name and state.
- Support keyboard operation and assistive technologies.
- Provide readable labels and appropriately sized interaction targets.
- Avoid conveying selection or state through color alone.
- Keep focus behavior predictable when navigation opens and closes.

## User Experience

1. An authenticated user opens any TaskGo screen.
2. On a larger screen, the complete navigation remains visible.
3. On a compact screen, the user sees a consistently positioned and clearly identified menu control.
4. The user activates the control and sees the complete navigation with the same groups and labels used on larger screens.
5. The current destination is visibly identified.
6. The user selects a destination.
7. The navigation closes and the selected destination opens.
8. The navigation remains available from the new screen.

The compact navigation must prioritize clarity and discoverability. It must preserve logical grouping despite the number of destinations and must not obscure the user's understanding of their current context.

## High-Level Technical Constraints

- The experience must preserve the current authenticated navigation destinations and user-availability rules.
- Existing destination addresses and expected account actions must continue to work.
- The navigation must meet the product's existing responsive and accessibility expectations.
- Opening or closing navigation must feel immediate and must not interrupt the current user task.
- The experience must support compact mobile screens without horizontal page scrolling.

## Non-Goals

- Redesigning individual destination pages.
- Adding, implementing, or renaming destination pages.
- Prioritizing destinations based on usage without validated evidence.
- Creating personalized or user-configurable navigation.
- Changing authentication or authorization rules.
- Redesigning public, unauthenticated navigation.
- Introducing a mobile-only information hierarchy.
- Implementing support, Premium, cards, payments, security, notifications, preferences, professional information, bank account, or earnings destinations.

## Phased Rollout Plan

### MVP — Complete adaptive navigation

- Provide complete navigation on every authenticated screen.
- Preserve labels, ordering, actions, and availability for registered destinations.
- Hide every destination without a registered route from both responsive presentations.
- Keep navigation visible on larger screens and accessible through a clear control on compact screens.
- Provide active-destination feedback and accessible interaction.
- Validate that users can reach every available destination from mobile.

### Phase 2 — Usability validation

- Measure navigation discovery and destination access.
- Review user feedback about menu clarity and grouping.
- Address verified accessibility or usability barriers.
- Confirm that mobile users no longer need to return home to change areas.

### Phase 3 — Evidence-based optimization

- Evaluate whether frequently used destinations warrant faster access.
- Consider refinements only when supported by usage evidence.
- Preserve access to the complete navigation and cross-device consistency.

## Success Metrics

- 100% of registered authenticated destinations available from every applicable mobile screen.
- 100% parity in labels, grouping, ordering, actions, and availability between adaptive presentations.
- Users can reveal navigation with one action from any authenticated mobile screen.
- Users can reach any available destination without returning to the home screen.
- No critical accessibility barriers in the primary navigation journey.
- No regression in desktop access to navigation destinations.
- Reduced reports of users being unable to navigate between authenticated areas on mobile.

## Risks and Mitigations

- **Users may overlook the mobile control:** use a familiar, clearly labeled control in a consistent location.
- **The complete menu may feel dense:** retain clear categories, spacing, readable labels, and comfortable interaction targets.
- **Mobile and desktop experiences may drift over time:** treat destinations, grouping, order, and availability as shared product rules.
- **Users may expect hidden destinations from the previous desktop menu:** restore them only when their routes and user flows are implemented.
- **Users may lose context while the menu is open:** identify the active destination and allow easy dismissal.
- **Logout may be activated accidentally:** keep it visually separated from destination links and clearly labeled.
- **The change may affect established desktop habits:** preserve directly visible desktop navigation and existing destination organization.

## Architecture Decision Records

- [ADR-001: Adopt Unified Adaptive Navigation](adrs/adr-001.md) — Use consistent navigation rules across devices while adapting presentation to available screen space.

## Open Questions

- Establish baseline data for mobile navigation failures before rollout.
- Define the observation period used to evaluate MVP success.
- Determine whether promotional content requires separate mobile usability validation.
