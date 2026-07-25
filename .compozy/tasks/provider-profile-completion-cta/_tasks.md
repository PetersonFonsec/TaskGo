# Provider Profile Completion CTA — Task List

## Tasks

| # | Title | Status | Complexity | Dependencies |
|---|-------|--------|------------|--------------|
| 01 | Validate Pagar.me recipient, bank-account, and Pix payout capabilities | completed | medium | — |
| 02 | Define shared profile-completion and mutation contracts | completed | medium | task_01 |
| 03 | Add payout-profile and structured-social persistence | completed | high | task_01, task_02 |
| 04 | Enforce authenticated provider identity and role boundaries | completed | medium | — |
| 05 | Secure authenticated address ownership and filtering | completed | high | task_04 |
| 06 | Extend the Pagar.me adapter for recipient payout configuration | pending | high | task_01, task_02 |
| 07 | Implement provider payout synchronization service | pending | high | task_03, task_04, task_06 |
| 08 | Expose idempotent payout mutation and status endpoints | pending | high | task_07 |
| 09 | Persist and update structured provider social links | pending | high | task_03, task_04 |
| 10 | Introduce the managed profile-photo storage boundary | pending | medium | task_02 |
| 11 | Expose authenticated profile-photo upload | pending | high | task_04, task_10 |
| 12 | Implement server-derived profile-completion query | pending | high | task_03, task_05, task_07, task_09, task_11 |
| 13 | Add Angular profile-completion state and domain clients | pending | high | task_02, task_08, task_09, task_11, task_12 |
| 14 | Build the centralized provider completion journey | pending | high | task_13 |
| 15 | Add accessible provider-home completion CTA | pending | high | task_13 |
| 16 | Add payout reconciliation and profile-completion telemetry | pending | high | task_07, task_12 |
