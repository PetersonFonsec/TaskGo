# Critical Marketplace Journey Protection

## Overview

TaskGo needs a trustworthy baseline for its critical marketplace journey. Visitors must continue discovering active categories, services, and public provider profiles. Private actions must require authenticated identity, respect resource ownership, preserve official pricing, and expose only the personal data required for each interaction.

This initiative protects customers and providers from unauthorized access, price manipulation, and unnecessary personal-data exposure.

## Goals

- Prevent unauthorized access to orders and addresses.
- Ensure every order uses the official service price.
- Preserve a useful public marketplace catalog.
- Restrict personal-data exposure to the minimum contextual need.
- Establish a release gate with zero known unauthorized-access cases in critical journeys.

## User Stories

### Visitor

- As a visitor, I want to browse categories, active services, and public provider profiles so that I can evaluate TaskGo before creating an account.

### Customer

- As a customer, I want to manage only my own addresses so that my location data remains private.
- As a customer, I want to create an order using the official service price so that the transaction is predictable.
- As a customer, I want to view only my orders so that my history remains private.

### Provider

- As a provider, I want to view and manage only orders associated with my services so that I can work securely.
- As a provider, I want to receive only the customer details needed to fulfill a confirmed service.

## Core Features

### Public Marketplace Discovery

Visitors can view:

- Active categories
- Active services
- Public provider profiles
- Public reputation information relevant to provider selection

Public responses must exclude private contact details, addresses, credentials, and internal personal identifiers.

### Protected Account Journeys

A valid authenticated session is required for:

- Contracting a provider
- Viewing or managing orders
- Viewing or managing addresses
- Accessing private account information
- Confirming or cancelling provider orders

### Ownership-Based Access

- Customers can access only their own orders and addresses.
- Providers can access only orders associated with their services.
- Users cannot gain access by changing identifiers in requests.

### Official Order Pricing

- The customer selects a service and sees its current official price.
- The order records the authoritative platform value.
- Client-provided price overrides are not accepted.

### Contextual Data Minimization

- Password hashes never appear in user-facing responses.
- CPF, email, phone, and full address remain private by default.
- Personal data appears only when required by an authorized journey.
- Public profiles include only information needed for provider discovery.

## User Experience

1. A visitor browses public categories and active services.
2. The visitor opens a provider profile containing only public information.
3. When the visitor chooses to contract a provider, TaskGo requires login.
4. The authenticated customer selects a service and sees the official price.
5. The customer selects or creates an address visible only within their account.
6. The customer creates an order and can follow it from their private history.
7. The associated provider sees the pending order and can confirm or cancel it.
8. Each participant receives only the information required for the current stage.

Unauthorized actions must fail clearly without revealing whether unrelated private records exist.

## High-Level Technical Constraints

- Existing login, public discovery, customer history, provider pending-order, and address-management journeys must remain supported.
- Data handling must follow LGPD necessity and prevention principles.
- Critical access rules must apply consistently across all user-facing channels.
- Public discovery must remain available without authentication.
- Security controls must not depend on client-side filtering.

## Non-Goals (Out of Scope)

- Redesigning the marketplace visual interface.
- Adding new payment methods.
- Implementing provider bidding or customer price negotiation.
- Redesigning provider onboarding.
- Solving non-critical scaffold CRUD operations.
- Completing password recovery.
- Performing a broad rewrite of unrelated services.

## Phased Rollout Plan

### MVP (Phase 1): Complete Critical Journey Protection

- Preserve limited public discovery.
- Require identity for private journeys.
- Enforce customer and provider ownership boundaries.
- Use official service pricing for new orders.
- Minimize public and private response data.
- Release only after the critical acceptance gate is satisfied.

### Phase 2: Expanded Privacy Review

- Classify remaining endpoints as public, private, or role-restricted.
- Review adjacent profile and account journeys.
- Refine contextual contact disclosure after confirmed orders.

### Phase 3: Continuous Trust Controls

- Add periodic access reviews.
- Add operational monitoring for suspicious activity.
- Evaluate independent security review before production scale-up.

## Success Metrics

- Zero known cases of users viewing or changing third-party orders.
- Zero known cases of users viewing or changing third-party addresses.
- Zero accepted order requests with a client-defined authoritative price.
- Zero password hashes in user-facing responses.
- Zero sensitive personal fields in public marketplace responses.
- No regression in anonymous browsing of categories, active services, and public provider profiles.

## Risks and Mitigations

- **Reduced response payloads may affect existing screens.** Validate each critical journey against its actual information needs.
- **Stricter access rules may surprise users accustomed to permissive behavior.** Use clear login prompts and access-denied messages.
- **Public discovery may expose too much or too little information.** Define an explicit public-profile field list and review it with product stakeholders.
- **Broad refinement may delay release.** Keep the initiative focused on trust and privacy outcomes; defer unrelated improvements.

## Architecture Decision Records

- [ADR-001: Protect the Complete Critical Marketplace Journey](adrs/adr-001.md) - Deliver authentication, ownership enforcement, pricing integrity, and data minimization as one coherent MVP.

## Open Questions

- Which contact details become visible after a provider confirms an order?
- Should administrators receive an exception path for support operations?
- Should users be notified when access to a private resource is denied repeatedly?
- Is an independent security review required before production launch?
