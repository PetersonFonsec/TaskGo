# Product Requirements Document: Shared Domain Language for Authentication and Profile

## Overview

TaskGo needs shared domain language for authentication and user profile concepts across its customer frontend, backoffice frontend, and backend. Today, these concepts appear in multiple local models, DTOs, enums, and session/profile shapes, which increases the risk of inconsistent behavior and duplicated interpretation.

This initiative will create a focused MVP around authentication and profile flows. The primary value is a single shared understanding of public user, role, session, address, and profile concepts so teams can change these flows with less drift and more confidence.

## Goals

- Ensure frontend, backoffice, and backend use the same authentication and profile concepts without duplicated model definitions.
- Reduce mismatches between user-facing profile data and backend-owned identity/session data.
- Make public shared concepts easy to discover and distinguish from app-specific or internal-only concepts.
- Prove value in one critical flow before expanding shared libraries to services, orders, payments, or backoffice audit domains.

## User Stories

- As a customer app developer, I want shared user and profile concepts so that profile screens do not drift from backend responses.
- As a backoffice developer, I want shared role and session language so that admin-facing authentication behavior stays consistent.
- As a backend developer, I want clear public domain concepts so that frontend contracts do not depend on internal implementation details.
- As a product maintainer, I want authentication/profile changes to be reflected consistently across applications so that regressions are easier to prevent.

## Core Features

- Shared authentication vocabulary: Defines public concepts such as authenticated user, session, token-bearing login result, and role.
- Shared profile vocabulary: Defines public concepts for user profile identity, contact information, address summary, and profile completion state.
- Public versus internal boundary: Clearly marks which concepts are safe for cross-application use and which remain internal to a specific app or backend workflow.
- MVP adoption in authentication/profile flows: Applies the shared language to the existing customer and backoffice login/profile experience as the proof point.
- Discoverable shared catalog: Gives developers a single place to understand what shared concepts exist and when to use them.

## User Experience

Developers should be able to create or update authentication and profile behavior without hunting through multiple local model files. When a user profile field or role concept changes, the expected meaning should be clear across customer, admin, and backend contexts.

For end users, the intended outcome is consistency: login state, displayed profile information, role-based behavior, and profile updates should align across the apps that surface them.

## High-Level Technical Constraints

- The MVP must work within the existing monorepo and current application boundaries.
- Shared concepts must not expose private backend-only behavior to frontends.
- The shared language must support both customer-facing and admin-facing authentication/profile needs.
- The solution should remain small enough to validate before migrating other domains.

## Non-Goals (Out of Scope)

- Migrating every entity, DTO, or interface in the monorepo.
- Reworking services, categories, orders, payments, audit logs, or provider operations in the MVP.
- Creating a broad platform-wide shared foundation before proving adoption in authentication/profile.
- Redesigning authentication or profile UX.
- Defining implementation architecture, build strategy, or code generation mechanics in the PRD.

## Phased Rollout Plan

### MVP (Phase 1)

- Define shared public domain language for authentication and profile.
- Apply it to the customer frontend, backoffice frontend, and backend authentication/profile flows.
- Remove or deprecate duplicate local models where the shared concept fully replaces them.
- Success criteria: the three applications use the same authentication/profile concepts without duplicated public models.

### Phase 2

- Expand shared language to adjacent identity concepts, such as verification, profile completion, and address summaries.
- Add guidance for when teams should create new shared concepts versus local app models.
- Success criteria: new authentication/profile changes require fewer app-specific model updates.

### Phase 3

- Evaluate expansion into other high-value domains such as services, categories, orders, scheduling, payments, and admin audit.
- Success criteria: shared language becomes a repeatable product practice, not a one-off cleanup.

## Success Metrics

- Zero duplicated public authentication/profile models across the three applications after MVP adoption.
- New authentication/profile changes require updates in one shared concept before app-specific presentation changes.
- Developers can identify public shared concepts versus internal-only concepts without asking for tribal knowledge.
- Reduced review churn caused by naming mismatches, role mismatch, session shape mismatch, or profile field drift.

## Risks and Mitigations

- Risk: The MVP becomes too broad by absorbing unrelated profile-adjacent behavior.
  Mitigation: Limit Phase 1 to authentication and profile concepts used by all three applications.

- Risk: Backend internals leak into frontend expectations.
  Mitigation: Treat shared language as public product contracts, not internal persistence or implementation models.

- Risk: Teams continue creating local models out of habit.
  Mitigation: Make the shared catalog discoverable and include clear adoption criteria.

- Risk: Domain language-first delivers less immediate API cleanup than a contract-first approach.
  Mitigation: Use authentication/profile flows as the proof point and include contract consistency as part of adoption.

## Architecture Decision Records

- [ADR-001: Prioritize Shared Domain Language for Authentication and Profile](adrs/adr-001.md) - Selects a domain language-first MVP for authentication and profile while keeping scope focused.

## Open Questions

- Which existing authentication/profile concepts should be considered public versus internal-only during implementation?
- Which duplicated frontend/backoffice/backend models should be deprecated first after the shared language exists?

## Research References

- Nx project dependency guidance: https://nx.dev/docs/concepts/decisions/project-dependency-rules
- Angular library guidance: https://angular.dev/tools/libraries/creating-libraries
- NestJS OpenAPI documentation: https://docs.nestjs.com/openapi/introduction
