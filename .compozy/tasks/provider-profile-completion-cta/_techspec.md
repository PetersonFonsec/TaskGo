# Provider Profile Completion CTA

## Executive Summary

Implement profile completion as a server-derived resource independent from the cached login payload. An authenticated query will calculate payout readiness and profile enrichment from Pagar.me status, photo, structured social fields, and owned addresses. Angular will share this resource between the provider-home CTA and a centralized completion page.

Pagar.me will remain authoritative for recipient bank-account configuration. TaskGo will store identifiers, synchronization state, completion indicators, and masked metadata only. Pix remains a customer payment method and is not part of provider payout configuration. The primary trade-off is an additional home request and gateway dependency in exchange for current, secure, independently refreshable status.

> **Capability decision — 2026-07-24:** Pagar.me Core API v5 publicly documents gateway-owned recipient and bank-account configuration but no recipient payout Pix-key operation or recipient-mutation idempotency contract. TaskGo selected the confirmed bank account as the sole provider payout requirement and will enforce idempotency locally. Official documentation and deterministic contract evidence satisfy the capability gate; sandbox verification remains optional. See [Pagar.me Core v5 Payout Capability Report](pagarme-capability-report.md).

## System Architecture

### Component Overview

| Component | Responsibility |
|---|---|
| `ProviderProfileCompletionService` — backend | Calculate the four checklist states and grouped progress |
| `ProviderPayoutProfileService` — backend | Coordinate recipient onboarding, gateway status, masking, and readiness |
| Existing Pagar.me adapter | Create/update recipients and translate gateway responses |
| User profile service | Persist the profile-photo URL |
| Provider profile service | Persist and validate structured social fields |
| Address service | Manage addresses using authenticated ownership |
| Shared contracts | Define completion, payout, photo, and social request/response types |
| Angular completion service | Load, cache, invalidate, and refetch completion state |
| Home completion card | Present prioritized progress and navigate to the centralized journey |
| Completion page | Render both checklist groups and their domain-specific actions |

### Data Flow

1. The provider home requests `GET /providers/me/profile-completion`.
2. The backend resolves user and provider identity from the access token.
3. The completion service reads payout status, photo, social links, and owned-address count.
4. The API returns four item states, two progress summaries, `payoutReady`, and `allComplete`.
5. Angular renders the CTA only when `allComplete` is false.
6. A successful domain mutation invalidates and refetches the completion resource.
7. Financial mutations synchronize with Pagar.me before confirming completion.

### PRD Traceability

| PRD requirement | Technical owner |
|---|---|
| Explain payout blockers | Completion query and home card |
| Separate required and recommended items | Shared completion contract and centralized page |
| Show progress and remaining actions | Backend-derived summaries and Angular presentation |
| Navigate directly to each action | Frontend item-to-route mapping |
| Hide the completed CTA | `allComplete` response state |
| Support existing providers | Server derivation and payout reconciliation |
| Protect financial information | Gateway ownership, masking, and response filtering |

## Implementation Design

### Core Interfaces

The primary service contract, represented as a Go reference type, keeps calculation separate from transport and storage:

```go
type ProfileCompletionService interface {
	Get(ctx context.Context, providerID string) (ProfileCompletion, error)
}

type ProfileCompletion struct {
	PayoutReady bool
	AllComplete bool
	Required    CompletionGroup
	Recommended CompletionGroup
	Items       []CompletionItem
}
```

Shared TypeScript contracts will define:

```ts
type CompletionItemId =
  | 'BANK_ACCOUNT' | 'PHOTO'
  | 'SOCIAL_LINKS' | 'ADDRESS';

interface CompletionItem {
  id: CompletionItemId;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETE' | 'ERROR';
  requiredForPayout: boolean;
}
```

Gateway operations will extend the existing Pagar.me boundary with recipient onboarding, bank-account configuration, and recipient-status retrieval. TaskGo-owned idempotency and reconciliation will protect mutations because gateway idempotency is undocumented.

### Data Models

#### Provider Payout Profile

Store alongside the provider or as a one-to-one payout profile:

- Provider identifier.
- Pagar.me recipient identifier.
- Synchronization status.
- Bank-account completion status.
- Masked bank label and final digits, when supplied by the gateway.
- Last synchronization timestamp.
- Last non-sensitive gateway error code.

Do not persist raw account credentials. Do not collect or persist a provider payout Pix key in this feature.

#### Provider Social Profile

Use structured nullable fields:

- `whatsapp`
- `instagram`
- `facebook`
- `linkedin`

Completion is true when at least one supported social field contains a valid value. Normalize the existing `linkdin` typo at the API boundary and expose only `linkedin` in new contracts.

#### Photo

Continue using `User.photoUrl`. The upload flow validates MIME type, size, and image content before storage. It replaces the previous asset only after the new upload succeeds.

#### Address

An address counts toward completion when at least one active address belongs to the authenticated user. Address queries and mutations must derive ownership from the token instead of trusting route or payload user IDs.

#### Completion Response

```json
{
  "payoutReady": false,
  "allComplete": false,
  "required": { "completed": 1, "total": 2 },
  "recommended": { "completed": 2, "total": 3 },
  "items": [
    {
      "id": "BANK_ACCOUNT",
      "status": "PENDING",
      "requiredForPayout": true
    }
  ]
}
```

Frontend routes do not appear in the API contract. Angular maps stable item identifiers to destinations.

### API Endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/providers/me/profile-completion` | Return server-derived checklist and progress |
| `PUT` | `/providers/me/payout/bank-account` | Validate and synchronize bank data with Pagar.me |
| `GET` | `/providers/me/payout/status` | Refresh gateway synchronization and readiness |
| `POST` | `/users/me/photo` | Upload, validate, and assign a profile image |
| `PUT` | `/providers/me/social-links` | Replace the provider’s structured social fields |
| `GET` | `/users/me/addresses` | Return only addresses owned by the authenticated user |
| `POST` | `/users/me/addresses` | Create an address for the authenticated user |
| `PATCH` | `/users/me/addresses/:addressId` | Update an owned address |
| `DELETE` | `/users/me/addresses/:addressId` | Remove an owned address |

All endpoints require authentication. Provider-specific endpoints require the `PRESTADOR` role. Ownership comes from the access token; request bodies cannot select another user or provider.

Expected status codes:

- `200` for successful query or update.
- `201` for successful photo upload or address creation.
- `400` for invalid fields or unsupported files.
- `401` for missing or invalid authentication.
- `403` for the wrong role or unowned resource.
- `404` for an owned resource that does not exist.
- `409` for conflicting or already-associated gateway data.
- `422` for gateway-rejected payout details.
- `502` or `503` for unavailable gateway operations without exposing gateway internals.

Mutating financial endpoints accept an idempotency key. Responses contain statuses and masked values only.

## Integration Points

### Pagar.me

- Extend the current adapter beyond order and charge creation.
- Recipient and bank-account operations are documented for Core v5; provider payout Pix-key configuration is out of scope.
- Authenticate using existing server-side gateway credentials.
- Apply TaskGo-owned idempotency and recipient reconciliation before gateway mutations.
- Map external states into stable internal statuses.
- Retry only transient failures using bounded backoff.
- Never log raw documents, account numbers, branch numbers, passwords, or gateway credentials.
- Reconcile existing `pagarmeRecipientId` values before requesting data again.

### File Storage

- Introduce a narrow storage abstraction behind the photo-upload endpoint.
- Use environment-specific storage configuration.
- Return stable public URLs.
- Validate type and size before persistence.
- Delete the previous image asynchronously only after the new URL is committed.
- Reject executable, malformed, oversized, or non-image payloads.

## Impact Analysis

| Component | Impact | Description and risk | Required action |
|---|---|---|---|
| Prisma schema and migrations | Modified | Adds payout status and social fields | Add compatible migration and backfill defaults |
| Pagar.me service | Modified | Adds recipient onboarding operations | Extend adapter and mock coverage |
| Payment service | Modified | Readiness can no longer rely only on recipient ID | Use explicit payout readiness |
| Provider module | Modified | Owns completion and social operations | Add authenticated services and endpoints |
| User module | Modified | Adds photo upload through `/me` ownership | Add upload validation and storage boundary |
| Address module | Modified | Existing ownership and filtering are unsafe | Enforce token-derived ownership |
| Shared library | Modified | Existing session types omit provider completion | Add focused shared contracts |
| Provider home | Modified | Adds the persistent CTA | Fetch completion independently |
| Provider routes | Modified | Adds centralized completion page | Add provider-scoped route |
| Session service | Modified | Current update method is ineffective | Avoid completion dependency on cached session |
| Registration social flow | Modified | Existing values are discarded and typoed | Normalize and persist supported fields |
| Existing providers | Data migration | Completion must reflect current data | Backfill status and reconcile recipients |

## Testing Approach

### Unit Tests

Backend:

- Completion truth table for required and recommended items.
- Payout readiness requires gateway-confirmed bank-account readiness.
- Gateway-state and error mapping.
- Idempotent recipient and payout updates.
- No sensitive financial values in responses or logs.
- Social normalization and per-field validation.
- Photo MIME, size, and malformed-content rejection.
- Authenticated address ownership and filtering.
- Payment compatibility after replacing the recipient-ID readiness check.

Frontend:

- CTA visibility for incomplete and complete states.
- Separate progress values and financial priority.
- Recommended-only state remains visible while payout readiness is true.
- Stable item-to-route navigation.
- Invalidation and refetch after successful mutations.
- Loading, processing, error, and retry states.
- Keyboard navigation and status announcements.

### Integration Tests

- Authenticated completion endpoint with persisted provider data.
- Provider-role and ownership enforcement for every mutation.
- Pagar.me adapter with mocked gateway responses, retries, and idempotency.
- Photo upload from multipart request through storage adapter.
- Address queries cannot read or mutate another user’s records.
- Migration defaults preserve existing providers and users.
- Shared contracts remain compatible across frontend and backend.

### End-to-End Tests

- Incomplete provider sees the CTA and both checklist groups.
- Completing the bank-account requirement changes `payoutReady` to true.
- Recommended-only pendencies keep the CTA visible.
- Completing all items removes the CTA.
- A customer never sees provider completion UI.
- Gateway rejection produces an actionable, non-sensitive error.
- Mobile viewport and keyboard-only completion navigation work.
- Pagar.me and file storage remain simulated in CI.

## Development Sequencing

### Build Order

1. Confirm documented Pagar.me recipient, bank-account, and status capabilities, record undocumented gateway idempotency, and finalize shared completion contracts — no implementation dependencies.
2. Add schema migrations and backfill strategy — depends on step 1.
3. Secure address ownership and filtering — depends on step 2.
4. Extend the Pagar.me adapter and add payout-profile synchronization — depends on steps 1 and 2.
5. Implement social persistence and photo-storage boundary — depends on step 2.
6. Implement domain mutation endpoints — depends on steps 3, 4, and 5.
7. Implement the server-derived completion query — depends on steps 2 through 6.
8. Add the Angular completion service and provider route — depends on step 7.
9. Build the home CTA and centralized completion page — depends on step 8.
10. Add backend, frontend, integration, and E2E coverage — depends on steps 3 through 9.
11. Reconcile existing recipients and validate rollout telemetry — depends on steps 4, 7, and 10.

### Technical Dependencies

- Documented Pagar.me recipient onboarding, bank-account, status, and rejection behavior.
- TaskGo-owned idempotency and reconciliation contract for recipient mutations.
- File-storage configuration for development, CI, and production.
- Maximum image size and accepted formats.
- Migration and reconciliation access for existing provider recipients.

## Monitoring and Observability

Track:

- Completion-query latency and failure rate.
- Recipient and bank-account onboarding attempts, success, rejection, and transient failure counts.
- Providers in `PENDING`, `PROCESSING`, `READY`, and `ERROR` payout states.
- Completion CTA impressions, starts, and item completion events.
- Photo-upload success, rejection reason, and storage failure counts.
- Status reconciliation age and divergence count.

Structured logs should include provider ID, item identifier, operation, status transition, gateway correlation ID, and non-sensitive error code. Financial values and photo contents must never appear in logs.

Alert when:

- Completion-query error rate exceeds the normal application threshold.
- Gateway failures remain elevated across consecutive monitoring windows.
- Payout profiles remain in `PROCESSING` beyond the expected gateway window.
- Reconciliation divergence increases after rollout.
- Photo-storage failures prevent successful uploads.

## Technical Considerations

### Key Decisions

- **Pagar.me owns payout data:** reduces sensitive local storage, with increased gateway dependency.
- **Completion uses a dedicated query:** prevents stale login state, with one additional home request.
- **Domain-specific mutations remain separate:** preserves validation and ownership boundaries, with a broader API surface.
- **TaskGo manages photo uploads:** provides a complete user journey, with file-storage operational responsibility.
- **Social networks use structured fields:** enables reliable validation, with schema changes required for new networks.
- **Testing uses the full pyramid:** maximizes confidence across domains, with higher delivery effort.

### Known Risks

- **Gateway capability drift:** retain deterministic contract checks, fail closed on unknown states, and use optional sandbox diagnostics when credentials are available.
- **Unsafe existing address access:** block checklist reuse until token-derived ownership is enforced.
- **Payout-state divergence:** refetch after mutations and run controlled reconciliation.
- **Sensitive-data exposure:** use gateway ownership, masking, log redaction, and serialization tests.
- **Photo-storage inconsistency:** validate the storage adapter in every environment before rollout.
- **Migration ambiguity for existing providers:** derive known states and mark unresolved states for reconciliation rather than assuming readiness.
- **Legacy social payload typo:** accept `linkdin` only at the compatibility boundary and normalize to `linkedin`.

## Architecture Decision Records

- [ADR-001: Centralized Provider Profile Completion Journey](adrs/adr-001.md) — Defines the centralized checklist and separates payout requirements from profile enrichment.
- [ADR-002: Gateway-Owned Provider Payout Data](adrs/adr-002.md) — Makes Pagar.me authoritative for payout configuration while TaskGo stores only safe status and masked metadata.
- [ADR-003: Server-Derived Profile Completion Resource](adrs/adr-003.md) — Uses one authenticated completion query with focused domain mutations and refreshable Angular state.
