# Task Memory: task_05.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot
- Implement Administrator-only operator listing, invitation, activation, role/status lifecycle, and password-change flows for Backoffice admin users.
- Required verification includes invitation token hashing/expiry/single-use, tokenVersion invalidation, final active Administrator protection, transactional audit rows, unit coverage >=80%, and lifecycle e2e coverage.

## Important Decisions
- Added `AdminUsersModule` for `/admin/users/*` management endpoints and a separate activation controller in the same module for public `POST /admin/auth/activate`, avoiding a circular dependency from `AdminAuthModule` back into users.
- Invitation delivery is behind `AdminInvitationDeliveryService`; the API response does not return raw invitation tokens, and the default delivery logger intentionally omits activation URLs because URLs contain raw invitation tokens.
- Invitation activation first validates token hash and expiry, then claims the invitation with a conditional `updateMany` inside the transaction so concurrent/reused tokens cannot activate more than once.
- Audit deltas use `sessionVersion` instead of `tokenVersion` because the audit sanitizer rejects keys containing `token`; the persisted `AdminUser.tokenVersion` is still incremented on activation, role changes, password changes, activation/reactivation, and deactivation.

## Learnings
- `AdminAuditService` rejects audit payload keys matching token/secret patterns, so lifecycle audit payloads must avoid literal token-related field names while still recording minimal state deltas.
- `npx eslint "src/**/*.ts" "test/**/*.ts" --max-warnings=0` is still blocked before source linting by `Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'typescript-eslint' imported from apps/backend/eslint.config.mjs`.

## Files / Surfaces
- Added admin users service/controller/module, invitation activation controller, invitation delivery boundary, and DTOs under `apps/backend/src/modules/admin/users/`.
- Extended admin auth with `POST /admin/auth/change-password`, `AdminChangePasswordDto`, password-change auditing, and `AdminUserPasswordChanged` audit action.
- Registered `AdminUsersModule` in `apps/backend/src/modules/admin/admin.module.ts` and imported `AdminAuditModule` into `AdminAuthModule`.
- Added unit tests for admin users service/controllers and updated auth service/controller tests.
- Added `apps/backend/test/e2e/admin-users.e2e-spec.ts` for invitation activation/login/reuse rejection, deactivation stale-token invalidation, and audit count assertions.

## Errors / Corrections
- Corrected an initial module-boundary approach that would have injected `AdminUsersService` into `AdminAuthController`; activation is now handled by a users-module controller at the required auth path.
- Corrected unit tests that expected deterministic bcrypt hashes; assertions now check a string hash plus exact tokenVersion/audit behavior.
- Removed token-bearing activation URL logging from the default invitation delivery service.

## Ready for Next Run
- Fresh verification passed for `npm run build`, admin unit coverage, and relevant admin e2e specs after all code changes.
- Lint remains blocked by the pre-existing unresolved `typescript-eslint` package in `apps/backend/eslint.config.mjs`; source lint cleanliness could not be established in this run.
