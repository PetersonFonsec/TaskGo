# Security Rules

- Never commit secrets, tokens, passwords, private keys, or real credentials.
- Do not expose sensitive values in logs, exceptions, screenshots, test fixtures, or generated docs.
- Backend must enforce authentication, authorization, and validation. Frontend checks are only user experience helpers.
- Validate and normalize external input before persistence or side effects.
- Be careful with file upload, storage, email, JWT, password hashing, and role-related code.
- Do not weaken password handling, token expiration, guards, roles, CORS, helmet, or validation behavior without an explicit product/security reason.
- Prefer least-privilege data responses. Do not return password hashes, tokens, internal IDs, or private user fields unless already part of an intentional contract.
- Review Prisma query changes for unintended data exposure or missing tenant/user scoping.
