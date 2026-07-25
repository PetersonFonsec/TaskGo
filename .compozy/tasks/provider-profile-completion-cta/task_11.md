---
status: pending
title: Expose authenticated profile-photo upload
type: backend
complexity: high
dependencies:
  - task_04
  - task_10
---

# Task 11: Expose authenticated profile-photo upload

## Overview
Expose a multipart profile-photo endpoint that stores a validated image for the authenticated user and then persists only its stable public URL. Replacement must preserve the previous photo across upload or database failures and perform synchronous best-effort cleanup of the previous managed asset only after the new URL has committed successfully.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- 1. The backend MUST expose `POST /user/me/photo` under the existing singular user route convention and MUST accept exactly one multipart image field.
- 2. The endpoint MUST require a valid authenticated identity and MUST derive the target user ID exclusively from the task-04 authentication context.
- 3. The request MUST NOT accept a user ID, provider ID, storage key, or public URL capable of selecting another user or bypassing managed storage.
- 4. Multipart limits and the task-10 storage boundary MUST reject missing, empty, unsupported, malformed, executable, content-type-mismatched, or oversized files before `User.photoUrl` changes.
- 5. The service MUST store the validated new asset successfully before attempting to persist its stable URL and MUST persist only that URL in `User.photoUrl`.
- 6. Upload or validation failure MUST leave both the existing `photoUrl` and previous asset unchanged.
- 7. Database update failure after a successful upload MUST leave the existing `photoUrl` and previous asset unchanged and SHOULD synchronously attempt best-effort cleanup of the newly stored unreferenced asset.
- 8. After the new `photoUrl` commits successfully, the service MUST synchronously attempt best-effort deletion of the previous TaskGo-managed profile-photo asset.
- 9. Failure to clean the previous asset after a successful commit MUST NOT roll back or fail the successful profile update, and MUST emit only a non-sensitive observable cleanup warning.
- 10. Cleanup MUST NOT delete external URLs, default images, another user's asset, the newly committed asset, or any key outside the task-10 profile-photo namespace.
- 11. A successful response MUST use the task-02 safe photo contract and expose the authenticated user's stable `photoUrl` without filesystem paths, temporary multipart data, or storage credentials.
- 12. Error responses and logs MUST be actionable but MUST NOT expose file bytes, temporary paths, storage credentials, internal object paths, stack traces, or another user's profile data.
</requirements>

## Subtasks
- [ ] 11.1 Add the authenticated singular `/user/me/photo` multipart API and bind it to the task-04 user identity.
- [ ] 11.2 Enforce one-file multipart limits and delegate all image-content validation and durable storage to task 10.
- [ ] 11.3 Persist the new stable public URL only after successful storage and only for the authenticated user.
- [ ] 11.4 Preserve the previous URL and asset across validation, upload, and database failures while cleaning a newly orphaned asset best-effort.
- [ ] 11.5 Clean the previous managed asset synchronously and best-effort only after the new URL commits.
- [ ] 11.6 Return the safe photo response and map validation, authentication, missing-user, storage, and persistence failures without leaking internals.
- [ ] 11.7 Add regression coverage for ownership, validation, operation ordering, rollback behavior, cleanup isolation, and safe serialization.

## Implementation Details
Follow the TechSpec sections **Photo**, **API Endpoints**, **File Storage**, and **Known Risks**. Consume the authenticated identity boundary from task 04 and the configured validation/storage lifecycle contract from task 10. The controller owns multipart transport only; the user-domain operation owns replacement ordering and `photoUrl` persistence, while the storage adapter remains unaware of Prisma and authenticated users.

The required operation order is: resolve the authenticated user's current URL, validate/store the new image, persist the returned stable URL, then synchronously attempt cleanup of the previous managed asset. If URL persistence fails, retain the old database value and asset, and best-effort delete only the newly uploaded unreferenced asset. Cleanup failure after a committed update is observable but does not turn a successful upload into an API failure.

Do not reuse the generic profile update path to accept a caller-provided URL. Frontend multipart calls and completion-query invalidation remain in task 13.

### Relevant Files
- `apps/backend/src/modules/user/user.controller.ts` — Existing singular user route boundary where the authenticated `/me/photo` multipart operation belongs.
- `apps/backend/src/modules/user/user.service.ts` — Persists `User.photoUrl` today and must own safe replacement ordering for the authenticated user.
- `apps/backend/src/modules/user/user.module.ts` — Registers the task-10 storage dependency and upload operation.
- `apps/backend/src/shared/storage/profile-photo-storage.ts` — Task-10 boundary for validated save, stable URL output, namespace checks, and idempotent deletion.

### Dependent Files
- `apps/backend/src/modules/user/user.controller.spec.ts` — Must cover multipart delegation, token-derived ownership, missing-file behavior, and safe responses.
- `apps/backend/src/modules/user/user.service.spec.ts` — Must cover storage/database ordering, old/new asset preservation, cleanup behavior, and failure safety.
- `apps/backend/test/e2e/user-profile-photo.e2e-spec.ts` — Add HTTP-level coverage for authenticated multipart upload, replacement, isolation, validation, and persistence.

### Related ADRs
- [ADR-003: Server-Derived Profile Completion Resource](adrs/adr-003.md) — Requires a TaskGo-managed authenticated photo mutation that persists only a stable URL and remains independent from the completion query.

## Deliverables
- Authenticated `POST /user/me/photo` multipart endpoint using token-derived user ownership.
- User-domain replacement operation with validated storage-before-persistence ordering and stable `photoUrl` serialization.
- Failure-safe preservation of the previous URL/asset and best-effort cleanup of newly orphaned uploads.
- Synchronous best-effort cleanup of the previous managed asset after a successful database commit.
- Safe HTTP responses, exceptions, and cleanup observability without file or storage secrets.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for authenticated profile-photo upload, replacement, persistence, and cleanup **(REQUIRED)**

## Tests
- Unit tests:
  - [ ] A valid authenticated upload stores the image before updating `User.photoUrl` and returns the task-10 stable public URL.
  - [ ] The service updates only the token-derived user even when multipart metadata or form fields contain another user or provider ID.
  - [ ] Missing file, empty bytes, unsupported type, type/content mismatch, malformed image, executable content, and oversized content each fail before any database update.
  - [ ] Storage failure leaves the existing `photoUrl` and previous asset unchanged and exposes no storage path or credential.
  - [ ] Database failure after successful storage leaves the previous `photoUrl` and asset unchanged and triggers best-effort deletion of only the newly stored asset.
  - [ ] Successful database commit triggers deletion of the previous managed asset only after persistence completes.
  - [ ] Failure deleting the previous asset after commit still returns success with the new URL and records a non-sensitive cleanup warning.
  - [ ] A null, external, default, foreign-namespace, or same-as-new previous URL is never deleted.
  - [ ] The response contains only the approved stable photo contract and omits bytes, filename, temporary path, storage key, and credentials.
- Integration tests:
  - [ ] `POST /user/me/photo` with a valid token and valid image returns success, stores a retrievable asset, and persists its stable URL for the authenticated user.
  - [ ] A user cannot change another user's `photoUrl` by submitting ownership fields or another user's URL.
  - [ ] Replacing an existing managed photo commits the new URL before removing the old asset and leaves the new asset retrievable.
  - [ ] A simulated Prisma update failure preserves the old URL and asset and removes the newly uploaded orphan when cleanup succeeds.
  - [ ] A simulated old-asset deletion failure leaves the committed new URL intact and does not change the successful HTTP response.
  - [ ] Invalid and oversized multipart requests create no durable asset and do not change the stored profile URL.
  - [ ] Missing or invalid authentication cannot upload a photo or create a storage object.
  - [ ] Error responses and captured logs contain no file bytes, temporary filesystem paths, storage credentials, internal keys, or other-user profile data.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Only the authenticated user can replace their profile photo through `/user/me/photo`.
- `User.photoUrl` changes only after validated durable storage returns a stable URL.
- Upload and database failures preserve the previous URL and asset.
- A successful commit remains successful even when synchronous cleanup of the previous managed asset fails.
- Cleanup never targets assets outside the managed profile-photo namespace or the newly committed asset.
- API responses and logs expose no temporary upload data or storage secrets.
