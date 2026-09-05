---
name: auth-security
description: Use when implementing or reviewing TaskGo authentication, authorization, JWT handling, roles, permissions, secrets, endpoint protection, or security-sensitive data flows.
---

# TaskGo Authentication and Security

TaskGo uses Bearer JWTs and bcrypt. Customer/provider authentication uses the global `AuthGuard`, verified database identity, `RolesGuard`, and public/optional-auth decorators. Backoffice has separate admin tokens, `tokenKind`, `tokenVersion`, active status, admin roles/capabilities, guards, storage, and audit logging. Do not mix these trust domains.

- Default backend routes to authenticated; mark public endpoints explicitly. Validate exact Bearer shape, server-side identity/role, resource ownership, and least privilege.
- Keep coarse role checks in guards and resource-dependent authorization inside use cases/transactions. Protect admin mutations with capabilities and audit actor/request context.
- Never log tokens, passwords, card data, secrets, or raw sensitive payloads. Use configured sanitization, Helmet, strict CORS, global input validation, and generic unexpected-error output.
- Hash credentials with configured salt rounds. Use config validation and environment injection; never hardcode or edit secrets.
- Treat browser storage tokens and frontend guards as UX only; backend enforcement is authoritative.
- Assess brute force/rate limiting, expiry/revocation, replay, CSRF relevance, enumeration, mass assignment, injection, data minimization, and OWASP risks for changed surfaces.

No OAuth or refresh-token flow is established; do not invent one. Add unit and E2E coverage for unauthenticated, wrong-role, wrong-owner, stale/revoked admin, and valid paths.
