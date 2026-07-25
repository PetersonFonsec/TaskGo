# Pagar.me Core v5 Payout Capability Report

## Outcome

**Hard gate: PASSED with official documentation and deterministic contract evidence.**

Pagar.me Core API v5 publicly documents recipient creation, recipient retrieval, a required default bank account, bank-account replacement, and bank transfers. It does not publicly document a recipient payout Pix-key resource or mutation. TaskGo therefore cannot treat a Pagar.me payout Pix key as a confirmed capability.

The local environment was inspected on 2026-07-24 without printing secrets. It is configured for payment simulation, has no Pagar.me credential, has no platform recipient, and does not point to the sandbox base URL. Live sandbox verification remains an optional diagnostic and is not required to pass this capability gate.

TaskGo selected a Pagar.me-confirmed bank account as the only provider payout requirement on 2026-07-24. Pix remains a customer payment method. No downstream task may implement, collect, or persist a provider payout Pix key.

Tasks that depend on task 01 may proceed using the documented recipient and bank-account contract. Because Pagar.me does not publicly document recipient-mutation idempotency, downstream implementation must enforce TaskGo-owned idempotency, unique external recipient codes, conflict detection, and reconciliation before creation.

## Tested Context

| Item | Result |
|---|---|
| API contract | Pagar.me Core API v5 |
| Production URL in code | `https://api.pagar.me/core/v5` |
| Documented sandbox URL | `https://sdx-api.pagar.me/core/v5` |
| Local environment | Simulation enabled |
| Sandbox credential | Not configured |
| Platform recipient | Not configured |
| Live sandbox execution | Optional; skipped with explicit precondition result |
| Evidence date | 2026-07-24 |

## Capability Matrix

| Capability | Result | Evidence | TaskGo consequence |
|---|---|---|---|
| Create recipient | Supported by public API | `POST /recipients` | Store the returned recipient ID only after gateway acceptance |
| Retrieve recipient | Supported by public API | `GET /recipients/{recipient_id}` | Can support reconciliation of recipient state |
| Configure initial bank account | Supported and required | `default_bank_account` in recipient creation | Bank completion can derive from a gateway-confirmed recipient response |
| Replace bank account | Supported with additional security prerequisite | `PATCH /recipients/{recipient_id}/default-bank-account`; IP allowlist required | TaskGo must treat allowlist configuration as an operational dependency |
| Transfer settings | Supported | `PATCH /recipients/{recipient_id}/transfer-settings` | Payout schedule can remain gateway-owned |
| Provider payout Pix key | Not documented | No public Core v5 recipient or transfer endpoint found | Removed from the approved provider payout scope |
| Pix customer charge | Supported by the existing TaskGo adapter | `POST /orders` with `payment_method: pix` | Must remain distinct from provider payout configuration |
| Recipient/bank mutation idempotency | Not documented | No public recipient-specific contract found | TaskGo must own replay, conflict detection, and reconciliation |
| Rejected recipient/bank cases | HTTP 400 documented | Public API references and deterministic sanitized fixtures | Map to stable safe categories without exposing gateway payloads |

## Safe Local Metadata

The documented contract supports these safe local fields after gateway confirmation:

- Recipient identifier.
- TaskGo-generated external recipient code.
- Recipient registration/synchronization category.
- Default bank-account identifier.
- Bank-account synchronization category.
- Masked bank metadata supplied by the gateway, limited to what the UI needs.
- Last synchronization timestamp.
- Stable, non-sensitive TaskGo error category.

TaskGo must not persist or return the provider document, complete bank or branch number, authorization header, secret key, or full financial request/response.

## Provisional State Mapping

The deterministic contract suite maps known response states into:

- `NOT_CONFIGURED`: no recipient identifier.
- `PENDING`: gateway state such as `pending`, `processing`, or `registration`.
- `READY`: recipient and bank states are both confirmed as active, approved, or ready.
- `REJECTED`: any recipient or bank state is failed, rejected, blocked, or inactive.
- `UNKNOWN`: an unrecognized state that must not grant payout readiness.

Unknown gateway states must fail closed and remain `UNKNOWN`; optional sandbox findings may refine mappings without weakening this rule.

## Error Categories

| Gateway response | Safe TaskGo category |
|---|---|
| HTTP 400 or 422 | `VALIDATION` |
| HTTP 401 or 403 | `AUTHENTICATION` |
| HTTP 409 | `CONFLICT` |
| HTTP 429 or 5xx | `TRANSIENT` |
| Other response | `UNKNOWN` |

Raw gateway errors must remain server-side and pass through redaction before logging.

## Deterministic and Live Evidence

The checked-in fixture is explicitly labeled by source:

- `SYNTHETIC_CONTRACT` for deterministic accepted, rejected, and processing examples.
- `DOCUMENTATION_GAP` for the missing payout Pix-key resource.
- `GATEWAY_CONTRACT_UNDOCUMENTED` for replay and conflict scenarios that require TaskGo-owned idempotency.

The contract suite always validates fixture shape, state/error mappings, charge-versus-payout separation, TaskGo-owned idempotency requirements, and sensitive-data rejection. Its optional live sandbox block is opt-in and requires all of:

- `PAGARME_CAPABILITY_SANDBOX=true`
- `PAGARME_BASE_URL=https://sdx-api.pagar.me/core/v5`
- A `sk_test_` credential in `PAGARME_SECRET_KEY`
- `PAGARME_CAPABILITY_RECIPIENT_ID` for a disposable sandbox recipient

The mutation block additionally requires:

- `PAGARME_CAPABILITY_RECIPIENT_PAYLOAD` containing a valid disposable recipient JSON payload
- `PAGARME_CAPABILITY_BANK_PAYLOAD` containing a valid disposable bank-account JSON payload
- `PAGARME_CAPABILITY_IDEMPOTENCY_KEY` containing a unique non-sensitive test key

When enabled, the mutation block checks accepted recipient creation, invalid-recipient rejection, identical replay, conflicting replay, and bank-account update or the documented IP-allowlist rejection. Payload variables must contain sandbox-only synthetic data and must never be committed.

## Authoritative References

- [Create recipient](https://docs.pagar.me/reference/criar-recebedor-1)
- [Get recipient](https://docs.pagar.me/reference/obter-recebedor-1)
- [Update recipient bank account](https://docs.pagar.me/reference/atualizar-conta-banc%C3%A1ria-do-recebedor-1)
- [Update transfer settings](https://docs.pagar.me/reference/atualizar-informa%C3%A7%C3%B5es-de-transfer%C3%AAncia-1)
- [Core v5 recipient contract changes](https://docs.pagar.me/page/novas-regras-para-cria%C3%A7%C3%A3o-de-sellers-de-marketplace-c-v5)
- [Pagar.me withdrawal guide](https://docs.pagar.me/v4/docs/saque-1)

## Reproduction

Run deterministic evidence:

```bash
npm test -- --runInBand pagarme-payout-capabilities.contract.spec.ts
```

Run focused coverage:

```bash
npm test -- --runInBand pagarme-payout-capabilities.contract.spec.ts \
  --coverage \
  --collectCoverageFrom=modules/payments/pagarme-payout-capabilities.contract.ts
```

The optional live sandbox block must only be enabled with disposable sandbox data. Never use production credentials or real provider financial information for this diagnostic.
