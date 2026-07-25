# Provider Profile Completion CTA

## Overview

TaskGo providers cannot receive payments until they supply the bank-account information required by the platform. The provider home currently does not explain this dependency or guide providers through outstanding profile information.

This feature introduces a persistent CTA on the provider home that opens a centralized completion journey. It separates payment requirements from optional information that improves trust and profile quality.

## Goals

- Increase the proportion of providers eligible to receive payments.
- Make payment-blocking requirements explicit and actionable.
- Help providers complete photo, social links, and addresses.
- Give new and existing providers a consistent completion experience.
- Reduce uncertainty about why a provider cannot receive payment.

## User Stories

- As a provider, I want to know whether I can receive payments so that I can resolve blockers before completing work.
- As a provider, I want to distinguish mandatory payment information from recommended profile improvements.
- As a provider, I want to see my progress and remaining actions.
- As a provider, I want each checklist item to take me directly to the corresponding completion step.
- As a provider with a complete registration, I want the CTA removed so that my home prioritizes current work.

## Core Features

### Provider-home CTA

- Appears for every provider with at least one outstanding item.
- Communicates that completing financial information enables payment receipt.
- Prioritizes payment-blocking requirements.
- Remains visible until both checklist sections are complete.
- Does not appear to customers or administrators.

### “Required to Receive Payments” Checklist

- Includes the Pagar.me-confirmed bank account.
- Shows each item as pending or completed.
- Explains that incomplete items prevent the provider from receiving payments.
- Provides a direct action for each pending item.
- Keeps customer Pix payments separate from provider payout configuration.

### “Strengthen Your Profile” Checklist

- Includes profile photo, social links, and addresses.
- Shows each item as pending or completed.
- Explains that these items improve profile trust and quality but do not block payments.
- Provides a direct action for each pending item.

### Progress Communication

- Shows separate progress for the mandatory and recommended sections.
- Gives the financial checklist greater visual priority.
- Highlights the next incomplete financial action first.
- Updates completion status after an item is successfully added.

### Completion State

- Removes the CTA after all mandatory and recommended items are complete.
- Preserves payment readiness even if recommended information remains incomplete.
- Allows providers to continue managing their information through the regular profile areas.

## User Experience

1. A provider with pending information enters the home.
2. The provider sees a prominent completion CTA.
3. The CTA communicates payment readiness and displays the two completion categories.
4. The provider selects a pending item.
5. TaskGo takes the provider to the corresponding completion experience.
6. After successful completion, the provider returns to an updated checklist.
7. When financial items are complete, TaskGo confirms that the provider is ready to receive payments.
8. The CTA remains available for recommended items and disappears when everything is complete.

The experience must use clear status labels, work on supported screen sizes, support keyboard navigation, and avoid relying exclusively on color to communicate completion or blocking states.

## High-Level Technical Constraints

- The CTA must reflect the provider’s current information rather than self-declared completion.
- Financial information must receive appropriate privacy and security protections.
- Payment eligibility messaging must remain consistent with TaskGo’s payment-provider requirements.
- The experience must not present customer Pix payment support as a provider payout requirement.
- Existing provider information should count toward completion without requiring re-entry.

## Non-Goals (Out of Scope)

- Redesigning the full provider home.
- Changing payment distribution or settlement rules.
- Requiring photo, social links, or addresses to receive payments.
- Creating a public profile-quality score or ranking.
- Introducing identity verification beyond existing payment requirements.
- Adding new profile enrichment categories beyond the four defined items.
- Sending email, push, or external reminders in the MVP.

## Phased Rollout Plan

### MVP (Phase 1): Centralized Completion Journey

- Launch the CTA for all providers with pending information.
- Deliver both checklist sections and their individual progress.
- Support bank account, photo, social links, and addresses.
- Measure CTA engagement and payout-readiness completion.

Success criterion: providers can identify payment blockers and complete the required financial information through the journey.

### Phase 2: Journey Optimization

- Improve guidance based on observed abandonment points.
- Refine prioritization and contextual messaging.
- Add non-intrusive recovery prompts if evidence shows they are needed.

Success criterion: measurable improvement in completion rate without creating excessive home-page distraction.

### Phase 3: Profile-Quality Expansion

- Evaluate additional trust-building profile elements.
- Consider contextual benefits tied to profile completeness.

Success criterion: evidence that further enrichment improves provider discovery, trust, or hiring outcomes.

## Success Metrics

Primary metric:

- Percentage of providers eligible to receive payments.

Supporting metrics:

- Percentage completing bank account information.
- Conversion from CTA view to started action.
- Completion rate for each checklist item.
- Time from first CTA exposure to payment readiness.
- Percentage completing all recommended profile items.
- Abandonment rate by checklist step.

Initial targets will be established after measuring the current baseline.

## Risks and Mitigations

- **Mandatory and recommended items may be confused:** use separate sections, explicit labels, and distinct explanations.
- **The CTA may compete with operational home content:** prioritize concise information and clear next actions.
- **Providers may abandon a long checklist:** prioritize financial blockers and show incremental progress.
- **Existing providers may distrust new financial requests:** explain why the information is needed and how it enables payments.
- **Customer Pix payments may be confused with provider payouts:** state that provider settlement uses the Pagar.me-confirmed bank account.
- **Incomplete existing support for some profile items may expand scope:** keep the MVP limited to the four approved checklist items.

## Architecture Decision Records

- [ADR-001: Centralized Provider Profile Completion Journey](adrs/adr-001.md) — Separates payout requirements from profile enrichment within one persistent completion experience.

## Open Questions

- Current baseline for providers already eligible to receive payments.
- Numeric target and evaluation period for the primary success metric.
- Exact provider-facing wording for payment readiness and Pix requirements.
- Whether the completed state needs a temporary success confirmation before the CTA disappears.
