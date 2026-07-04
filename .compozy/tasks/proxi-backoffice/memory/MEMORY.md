# Workflow Memory

Keep only durable, cross-task context here. Do not duplicate facts that are obvious from the repository, PRD documents, or git history.

## Current State

## Shared Decisions
- Provider lifecycle compatibility is enforced in the database: `prestadores.verificado` must equal `prestadores.status = APPROVED`. Future provider lifecycle commands must update both fields together.

## Shared Learnings
- Seed and fixture code that creates verified providers must also set `status: APPROVED`; unverified providers must remain `status: PENDING`.
- Administrative request identity is attached by `AdminAuthGuard` on `request.adminOperator`; future admin authorization work should read the persisted operator from that request field instead of trusting JWT role claims alone.
- HTTP requests now receive `request.requestId` from `x-request-id`, active trace ID, or a generated UUID. Future audited admin commands should use `buildRequestAuditContext(request)` for request ID, IP address, and user agent metadata.
- `AdminAuditService` rejects audit payload keys that look secret-bearing, including names containing `token`; future audited state deltas should avoid literal token-related key names and use safe aliases such as `sessionVersion`.
- Administrative invitation activation URLs contain raw invitation tokens; future delivery/logging work must not write those URLs or tokens to application logs.
- Provider dashboard API uses `from`/`to` ISO query boundaries, defaults to a 30-day reporting window, caps ranges at 90 days, and bounds pending-provider counts by provider `createdAt`.

## Open Risks
- Backend ESLint config currently imports `typescript-eslint`, but the package is not resolvable in the checked-in workspace; lint commands fail before checking source files until that dependency/config issue is fixed. A temporary install showed additional broad type-aware lint debt outside task 03, so fixing the missing package may expose many unrelated lint errors.
- Backoffice Cypress 15.5.0 cannot launch in this macOS arm64 environment: the cached binary rejects Cypress smoke-test flags (`--no-sandbox`, `--smoke-test`, `--ping`) even after `npx cypress install --force`; `CYPRESS_SKIP_VERIFY=true npx cypress run --browser chrome` then fails on a missing `Contents/MacOS/Contents/Resources/app/index.js`. Future UI tasks need a fixed Cypress binary/cache before e2e specs can execute here.

## Handoffs
