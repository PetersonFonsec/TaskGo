# PRD: Profile screens (clients & professionals)

## Overview

- Problem: Users (clients and professionals) need an intuitive way to view and maintain their contact and address data so bookings, communications, and listings remain accurate.
- Who: Primary personas are Clients (people who request services) and Professionals (service providers).
- Why: Reduces support load, improves service matching and booking reliability, and increases trust by keeping contact/address data current.

## Goals

- Primary success metric: Profile completion rate — % of users who finish required fields.
- Business outcomes: reduce booking failures due to bad contact info; lower support requests for profile updates; increase completed profiles by 30% within 8 weeks post-launch.
- Timeline: MVP (core profile) in next sprint; role-specific sections in subsequent phases.

## User Stories

- As a Client, I want to edit my contact info and addresses so that service providers can reach me.
- As a Professional, I want to edit my contact info, service addresses, and professional details so clients can find and book me.
- As an Admin, I want to see whether required profile fields are completed so I can follow up if needed.

## Core Features

- Core profile (MVP): editable display name, avatar/photo, primary contact phone, primary email, primary address (labeled).
  - Functional: view and edit, inline validation, save/cancel, clear success/failure feedback.
- Multiple addresses: users can add labeled addresses (home, work, service area).
- Role extensions (post-MVP): professional credentials, service area definitions, business hours, client preferences.
- Field-level rules: required fields for onboarding vs optional for later editing; verification for phone/email (see UX).

## User Experience

- Personas & goals: quick access to edit personal contact info; minimal friction to save changes.
- Primary flow (MVP):
  1. User opens Profile > sees core fields and current values.
  2. Clicks Edit > fields become editable (or navigate to Edit screen).
  3. User updates values, saves; system validates and shows confirmation.
  4. If phone/email changed, verification step is triggered (out-of-band confirmation).
- UX considerations: clear labeling, progressive disclosure for advanced professional fields, accessible form controls, mobile-first layout, autosave warnings and undo.
- Accessibility: labels, ARIA attributes on form controls, keyboard navigation, color contrast compliance.

## High-Level Technical Constraints

- Must integrate with existing user account system and contact verification flows.
- Must comply with data privacy: users control their contact info; changes logged for audit.
- Performance: load and save flows should complete within acceptable UI feedback time (<2s perceived).

## Non-Goals (Out of Scope)

- Not covering complex scheduling/business rules (business hours management is Phase 2).
- Not prescribing verification implementation mechanics (that belongs to TechSpec).
- Not adding third-party directory publishing in MVP.

## Phased Rollout Plan

### MVP (Phase 1)
- Core features: shared profile view/edit for both roles, labeled multiple addresses, phone/email fields, verification trigger on change.
- Success criteria: Profile completion rate increases; >80% of saved edits complete without errors.

### Phase 2
- Role-specific: professional credentials, service areas, business hours; improved discoverability for professionals.
- Success criteria: professionals add required fields at expected rates; no material increase in support volume.

### Phase 3
- Advanced features: bulk address import, address validation suggestions, admin bulk edits.
- Success criteria: High-quality address data and reduced manual admin fixes.

## Success Metrics

- Primary: Profile completion rate (required fields percentage).
- Secondary: Edit success rate (saves without validation errors), time-to-complete edits, reduction in profile-related support tickets.

## Risks and Mitigations

- Risk: Users avoid completing profile due to long forms — mitigate with progressive disclosure and required minimum fields only.
- Risk: Verification friction reduces saves — implement asynchronous verification and allow temporary save with pending status.
- Risk: Missing role-specific fields cause dissatisfaction — communicate phased timeline and collect add requests.

## Architecture Decision Records

- [.compozy/tasks/profile-perfil/adrs/adr-001.md](.compozy/tasks/profile-perfil/adrs/adr-001.md) — Modular phased rollout: shared core now, role-specific sections later.

## Open Questions

- What should be mandatory at signup vs editable later?
- Are there regulatory constraints for address storage in target markets?
- Are there any fields that must be present for booking to complete (e.g., verified phone)?

---

*Draft prepared 2026-05-30*