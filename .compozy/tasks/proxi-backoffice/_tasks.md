# Proxi Backoffice — Task List

## Tasks

| # | Title | Status | Complexity | Dependencies |
|---|-------|--------|------------|--------------|
| 01 | Persist administrative identities, provider lifecycle, and audit models | completed | high | — |
| 02 | Implement administrative JWT authentication | completed | high | task_01 |
| 03 | Enforce administrative authorization and fixed roles | pending | high | task_02 |
| 04 | Create immutable transactional audit writes | pending | high | task_01, task_03 |
| 05 | Implement operator invitations and lifecycle | pending | high | task_02, task_03, task_04 |
| 06 | Expose provider queue, details, and history | completed | high | task_01, task_03 |
| 07 | Implement audited provider lifecycle commands | completed | high | task_04, task_06 |
| 08 | Build provider operational dashboard API | completed | medium | task_06, task_07 |
| 09 | Expose paginated audit log queries | pending | medium | task_03, task_04 |
| 10 | Create the independent Angular Backoffice application | pending | high | — |
| 11 | Implement Backoffice authentication, session, and shell | pending | high | task_02, task_03, task_10 |
| 12 | Implement provider queue, details, and decisions UI | pending | high | task_06, task_07, task_11 |
| 13 | Implement operator administration UI | pending | high | task_05, task_11 |
| 14 | Implement provider dashboard UI | pending | medium | task_08, task_11 |
| 15 | Implement audit search and detail UI | pending | medium | task_09, task_11 |
| 16 | Configure deployment, observability, and performance validation | pending | high | task_08, task_09, task_10, task_11 |
