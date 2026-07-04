# Proxi Backoffice Product Requirements Document

## Overview

The Proxi Backoffice is the secure administrative workspace for operating the Proxi services marketplace. It gives internal teams controlled access to providers, customers, orders, disputes, payments, services, categories, and reviews.

The product will be delivered as complete operational verticals. The MVP focuses on provider governance, fixed administrative roles, and comprehensive auditability.

## Goals

- Ensure 100% of sensitive administrative actions are attributable to an authenticated operator.
- Prevent administrative roles from accessing unauthorized data or actions.
- Enable administrators to review, approve, reject, block, and unblock providers.
- Give operators enough provider context to make consistent decisions.
- Establish reusable access and audit rules for subsequent verticals.
- Resolve at least 90% of provider applications within one business day.

## User Stories

### Administrator

- As an Administrator, I want to manage backoffice users so that only authorized employees access administrative functions.
- As an Administrator, I want to approve or reject providers so that only eligible professionals operate on Proxi.
- As an Administrator, I want to block or unblock providers with a recorded reason.
- As an Administrator, I want to inspect audit history so that I can investigate administrative activity.

### Support

- As a Support operator, I want to view provider profiles and status histories so that I can answer operational questions.
- As a Support operator, I want restricted access that prevents provider governance decisions.

### Finance

- As a Finance operator, I want access limited to financial responsibilities as those capabilities become available.

### Moderator

- As a Moderator, I want access limited to services, categories, and reviews when the moderation vertical is released.

## Core Features

### Fixed administrative roles

The Backoffice provides four non-customizable profiles:

- **Administrator:** full administrative governance, operator management, provider decisions, and audit access.
- **Support:** operational consultation and customer-support workflows.
- **Finance:** payment, refund, and financial reporting workflows.
- **Moderator:** service, category, and review moderation workflows.

Users cannot receive individual permission exceptions in the MVP.

### Administrative access management

Administrators can invite, activate, deactivate, and assign one fixed role to internal operators. Deactivated operators immediately lose Backoffice access. All changes are auditable.

### Provider queue

Administrators can view providers awaiting review, filter the queue by status and submission date, and open a provider's complete review record.

### Provider review

The review record presents identity, contact information, verification state, offered services, operational history, and any information required by Proxi's provider policy.

### Provider decisions

Authorized Administrators can:

- Approve a pending provider.
- Reject a provider with a mandatory reason.
- Block an active provider with a mandatory reason.
- Unblock a provider with a mandatory reason.

Actions take effect directly without secondary approval. The interface must clearly communicate their consequences before confirmation.

### Provider lifecycle history

Operators can see the provider's current status and chronological decision history, including responsible operator, timestamp, reason, and previous state.

### Audit log

The audit log records:

- Authenticated operator and assigned role.
- Date and time.
- Action performed.
- Affected record.
- Previous and resulting states.
- Mandatory justification when applicable.
- Relevant contextual information for investigation.

Audit records cannot be edited or deleted through the Backoffice. Administrators can search and filter them by operator, action, affected record, and date.

### Provider-focused dashboard

The MVP dashboard displays:

- Providers awaiting review.
- Approvals, rejections, blocks, and unblocks during the selected period.
- Average provider review time.
- Recent sensitive administrative actions.

Broader marketplace and financial indicators arrive with their respective verticals.

## User Experience

1. An operator signs in and sees only navigation allowed for their role.
2. The dashboard highlights work relevant to the operator.
3. An Administrator opens the pending-provider queue.
4. The Administrator reviews the provider's information and history.
5. The Administrator approves or rejects the provider.
6. Destructive or restrictive actions require confirmation and a reason.
7. The resulting status and audit event become immediately visible.
8. Administrators can investigate activity through searchable audit records.

The experience must use clear status labels, accessible confirmation dialogs, keyboard navigation, visible focus states, and non-color status indicators.

## High-Level Technical Constraints

- The Backoffice must use existing Proxi marketplace records as its authoritative operational context.
- Existing provider, service, order, payment, dispute, and review lifecycles must remain consistent.
- Personal data access must follow LGPD principles of necessity, access restriction, accountability, and traceability.
- Sensitive actions must remain attributable even after an operator is deactivated.
- Later payment workflows must remain consistent with Pagar.me transaction states.
- Administrative access must be separated from customer and provider access.

## Non-Goals (Out of Scope)

The MVP will not include:

- Custom roles or individual permission exceptions.
- Dual approval for sensitive actions.
- Customer management.
- Order administration or dispute resolution.
- Refund and payment operations.
- Service, category, or review moderation.
- Broad marketplace analytics.
- Automated provider approval or fraud scoring.
- Bulk provider approval, rejection, or blocking.
- External access for providers or customers.

## Phased Rollout Plan

### MVP (Phase 1): Provider Operations

- Fixed administrative roles.
- Backoffice operator management.
- Provider review queue and details.
- Provider approval, rejection, blocking, and unblocking.
- Provider lifecycle history.
- Comprehensive audit log.
- Provider-focused dashboard.

Exit criteria:

- All sensitive actions produce complete audit records.
- Unauthorized roles cannot access restricted information or actions.
- Administrators can complete the provider lifecycle end to end.
- Operational owners accept the permission matrix.

### Phase 2: Customer, Order, and Dispute Operations

- Customer consultation and blocking.
- Order search, details, and lifecycle visibility.
- Dispute queue, evidence review, decisions, and resolution history.
- Expanded Support permissions and operational indicators.
- Audit coverage for every new action.

### Phase 3: Finance and Moderation

- Payment consultation, failures, refunds, and financial indicators.
- Services and category administration.
- Review moderation and removal reasons.
- Expanded Finance and Moderator permissions.
- Cross-domain operational dashboard.

## Success Metrics

- 100% of sensitive administrative actions produce an audit record.
- Zero successful unauthorized administrative actions.
- 100% of active operators have exactly one approved role.
- At least 90% of provider applications receive a decision within one business day.
- Administrators can locate a specific audit event within two minutes.
- Fewer than 5% of provider decisions require correction because of missing context or process error.
- No operator retains access after administrative deactivation.

## Risks and Mitigations

- **Inconsistent provider decisions:** define explicit approval, rejection, and blocking policies and show them during review.
- **Excessive personal-data exposure:** restrict information by role and display only data necessary for each workflow.
- **Misuse of direct administrative actions:** require confirmation, justification, and complete auditability.
- **Pressure to add incomplete domains:** enforce vertical exit criteria before expanding scope.
- **Low operator adoption:** keep queues focused, provide clear status histories, and measure resolution time.
- **Audit volume obscuring important events:** provide targeted filters and prioritize sensitive actions.

## Architecture Decision Records

- [ADR-001: Deliver the Backoffice Through Complete Operational Verticals](adrs/adr-001.md) — Each domain is released as a complete, permission-controlled, auditable workflow.

## Open Questions

- Which documents or evidence are mandatory for provider approval?
- What retention period applies to administrative audit records?
- What exact operational SLA applies to provider reviews?
- Which provider conditions require immediate blocking?
- Who owns and periodically reviews the fixed permission matrix?
