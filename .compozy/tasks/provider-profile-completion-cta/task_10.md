---
status: pending
title: Introduce the managed profile-photo storage boundary
type: backend
complexity: medium
dependencies:
  - task_02
---

# Task 10: Introduce the managed profile-photo storage boundary

## Overview
Introduce a narrow, configurable backend boundary for validating, storing, locating, and deleting provider profile images. This task supplies safe storage behavior and stable public URLs for the later authenticated upload flow without adding an HTTP controller or modifying a user’s `photoUrl`.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- 1. The backend MUST expose a narrow profile-photo storage contract for saving validated image content, returning a stable public URL, and deleting a previously stored asset.
- 2. The active storage adapter and its public URL configuration MUST be selected through environment configuration and MUST support development, test/CI, and production settings without controller-specific branching.
- 3. Validation MUST enforce an explicit allowlist of image media types and extensions, a configurable maximum byte size, and agreement between declared type and inspected file content.
- 4. Empty, truncated, malformed, executable, polyglot, unsupported, or oversized content MUST be rejected before durable storage.
- 5. Generated object names MUST be collision-resistant and MUST NOT trust the client filename as a storage path or expose local filesystem structure.
- 6. Successful storage MUST return a stable, normalized public URL that remains valid independently of temporary multipart state.
- 7. Multer MAY provide transient multipart bytes in task 11, but Multer storage configuration MUST remain behind this boundary and MUST NOT become the durable-storage abstraction.
- 8. This task MUST NOT add the `/user/me/photo` controller, mutate `User.photoUrl`, or delete a previous image as part of a user-profile transaction.
</requirements>

## Subtasks
- [ ] 10.1 Define the profile-photo asset input, stored result, and storage lifecycle contract.
- [ ] 10.2 Define environment-driven storage, public URL, accepted-format, and maximum-size configuration.
- [ ] 10.3 Validate declared media type, size, filename-independent extension, and inspected image content before storage.
- [ ] 10.4 Provide the configured storage adapter with collision-resistant object naming and stable URL generation.
- [ ] 10.5 Support safe, idempotent deletion of assets owned by the profile-photo namespace.
- [ ] 10.6 Register the storage boundary for later user-domain use without adding an upload endpoint.
- [ ] 10.7 Add unit and integration coverage for validation, URL stability, configuration, storage, and deletion.

## Implementation Details
Add the storage contract and configured adapter in a focused backend shared or user-adjacent boundary, keeping the choice of durable provider replaceable. Refer to the TechSpec “File Storage,” “Photo,” and “Known Risks” sections. Consume the safe shared photo response vocabulary established by task 02 where applicable, but do not couple the storage interface to HTTP multipart types.

The existing `shared/utils/storage.ts` directly configures Multer disk storage under a relative assets path. Treat it as legacy behavior to replace or encapsulate for profile photos: client filenames must not determine durable paths, and stable URL generation must come from explicit configuration. Task 11 will own multipart interception, authenticated ownership, persistence of `User.photoUrl`, replacement ordering, and best-effort cleanup of the old image.

### Relevant Files
- `apps/backend/src/shared/utils/storage.ts` — Existing direct Multer disk-storage helper whose responsibilities must not leak into the new durable boundary.
- `apps/backend/src/modules/user/user.module.ts` — User-domain provider boundary that task 11 will use to consume profile-photo storage.
- `apps/backend/package.json` — Existing backend image-upload dependencies and test scripts constrain the implementation.
- `apps/backend/src/app.module.ts` — Root module composition and environment-aware provider registration conventions.

### Dependent Files
- `apps/backend/src/modules/user/user.service.ts` — Later task 11 persists the stable URL returned by this boundary.
- `apps/backend/src/modules/user/user.controller.ts` — Later task 11 adds the authenticated multipart endpoint without embedding storage logic.
- `libs/shared/src/auth-profile/index.ts` — Existing public `photoUrl` contract and task 02 photo response vocabulary.

### Related ADRs
- [ADR-003: Server-Derived Profile Completion Resource](adrs/adr-003.md) — Requires TaskGo-managed image validation and storage behind a configurable adapter while persisting only a stable URL.

## Deliverables
- Narrow profile-photo storage contract for save, stable URL result, and idempotent delete operations.
- Environment-validated configuration for adapter selection, public base URL, accepted image formats, maximum bytes, and profile-photo namespace.
- Image validator that checks size, declared type, and inspected content before durable writes.
- Configured adapter with collision-resistant names, path traversal protection, normalized stable URLs, and namespace-scoped deletion.
- Dependency registration usable by task 11 without an upload controller or user-profile mutation.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for configured profile-photo storage and stable URL behavior **(REQUIRED)**

## Tests
- Unit tests:
  - [ ] Valid PNG and JPEG buffers within the configured size and with matching declared types pass validation.
  - [ ] An empty buffer, truncated PNG, malformed JPEG, executable payload renamed as `.jpg`, and declared-type/content mismatch are each rejected before the adapter writes.
  - [ ] A file exactly at the configured maximum is accepted while a file one byte larger is rejected.
  - [ ] Client filenames containing `../`, absolute paths, duplicate names, Unicode separators, or executable extensions never determine the generated storage key.
  - [ ] Two saves with the same original filename produce distinct profile-photo keys and normalized URLs below the configured public base URL.
  - [ ] Deleting a missing profile-photo key is idempotent, while attempts to delete outside the configured namespace are rejected.
  - [ ] Invalid or missing adapter, byte-limit, allowlist, or public-base-URL configuration fails with a descriptive startup configuration error.
- Integration tests:
  - [ ] The test-environment adapter saves a valid image, returns a retrievable stable URL mapping, and removes the asset through the storage contract.
  - [ ] A rejected malformed or oversized image leaves no durable file or object in the configured profile-photo namespace.
  - [ ] Restarting or re-resolving the configured adapter produces the same public URL for an already stored key.
  - [ ] The user module resolves the storage contract from test configuration without importing a concrete adapter into controller or service code.
  - [ ] No `/user/me/photo` route or `User.photoUrl` mutation is introduced by this task.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Every accepted profile image passes size, declared-type, and inspected-content validation before durable storage.
- Stable public URLs derive only from validated environment configuration and collision-resistant storage keys.
- Malicious filenames and deletion keys cannot escape the profile-photo namespace.
- Development, CI, and production can select storage behavior through configuration without changing consumers.
- The boundary is ready for task 11 and contains no upload controller or user-profile persistence logic.
