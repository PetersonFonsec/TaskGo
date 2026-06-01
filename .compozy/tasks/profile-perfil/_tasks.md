# profile-perfil — Task List

## Tasks

| # | Title | Status | Complexity | Dependencies |
|---|-------|--------|------------|--------------|
| 01 | Backend: audit current user/address APIs and extend user update flow for profile edits | completed | low | — |
| 02 | Backend: support core profile field updates (display name, photo, phone, email) and return profile with addresses | completed | medium | task_01 |
| 03 | Backend: extend address support for labeled address types and primary address handling | completed | medium | task_01 |
| 04 | Backend: add phone/email verification trigger endpoints and pending-verification state support | completed | medium | task_02 |
| 05 | Frontend: implement shared Profile view and Edit screen using existing profile modules | pending | medium | task_02 |
| 06 | Frontend: implement address management UI for add/edit/delete and labeled address types | pending | medium | task_03 |
| 07 | Frontend: integrate phone/email verification status and save flow feedback | pending | medium | task_04, task_05 |
| 08 | QA: unit, integration, and Cypress tests for profile edit, address management, and verification flows | pending | medium | task_05, task_06, task_07 |
| 09 | Docs & release notes: document profile edit behavior, new endpoints, and rollout notes | pending | low | task_08 |
