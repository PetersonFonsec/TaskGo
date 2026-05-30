# Testing And Verification

- Every functional change needs verification proportional to its risk.
- Prefer the most specific validation command that covers the change.
- Useful root commands:
  - `npm run test`
  - `npm run build`
  - `npm run lint`
- Useful Nx targets:
  - `nx test backend`
  - `nx test frontend`
  - `nx build backend`
  - `nx build frontend`
  - `nx run backend:test-e2e`
  - `nx run frontend:e2e`
- Backend unit tests use Jest. Add or update tests for service behavior, validation, auth, and persistence-sensitive changes.
- Backend e2e tests are appropriate for HTTP flows, auth flows, database behavior, and cross-module integration.
- Frontend tests should cover component logic and important user-visible behavior.
- Cypress is appropriate for critical browser workflows.
- If tests cannot be run, state exactly which commands were skipped or failed and why.
