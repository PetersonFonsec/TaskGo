# TaskGo Agent Guidelines

## Project Overview

TaskGo is an Nx/npm-workspaces marketplace monorepo connecting clients and service providers, with booking/order lifecycle, Pagar.me payments, reviews, favorites, provider administration, and audit logging.

## Technology Stack

- `apps/backend`: NestJS 11, TypeScript, CQRS, Prisma 5, PostgreSQL 17, JWT/bcrypt, class-validator, Jest/Supertest, OpenTelemetry.
- `apps/frontend`: Angular 21 standalone/zoneless with SSR/hydration, RxJS, signals, SCSS, Jasmine/Karma, Cypress, Storybook.
- `apps/backoffice`: Angular 21 standalone/zoneless, signals/RxJS, Jasmine/Karma, Cypress, Nginx runtime configuration.
- `apps/landing-page`: Vite static JavaScript/CSS.
- Infrastructure: Docker Compose, Nginx, Prometheus, Grafana, Jaeger, and OpenTelemetry Collector. No repository CI/CD workflow is currently present.

## Repository Structure

- `apps/backend/src/modules`: bounded backend features; substantial writes/reads use command/query handlers.
- `apps/backend/src/shared`: cross-cutting backend guards, filters, pipes, contracts, and utilities.
- `apps/backend/src/prisma`: schema, migrations, and seeds.
- `apps/frontend/src/app/modules` and `shared`: public product features and reusable UI/services.
- `apps/backoffice/src/app/features`, `core`, and `layout`: administrative product.
- `libs/shared`: neutral frontend/backend contracts and value objects.
- `config`, `docs`, and `scripts`: local infrastructure, operational/reference documentation, and utilities.

## Development Principles

- Understand affected flows and read local patterns before changing files.
- Reuse established patterns; avoid premature abstractions and unnecessary dependencies.
- Preserve HTTP/data backward compatibility unless a breaking change is explicit.
- Validate external input, authorize resources server-side, handle errors, and avoid sensitive data exposure.
- Keep controllers thin; keep multi-write invariants transactional.
- Do not alter unrelated code or user-owned changes.
- Treat recommendations as recommendations when no stable convention exists.

## Feature Workflow

For relevant features prefer: **Understand → Plan → Implement → Test → Review**. Invoke only the repository skills relevant to the task; large ambiguous work normally begins with `$product-manager` and cross-cutting design may use `$saas-architect`.

## Definition of Done

- The affected project builds and has no TypeScript errors.
- Relevant tests pass; root commands are `npm run build`, `npm run test`, and, when configured, `npm run lint`.
- Prefer narrow targets such as `npx nx build backend`, `npx nx test backend`, `npm run backoffice:build`, `npm run backoffice:test`, and relevant E2E targets.
- Do not use backend `npm run lint` merely to check: it includes `--fix`. Use its non-writing ESLint equivalent when a read-only lint is required.
- Existing behavior is preserved, external inputs validated, errors handled, authorization considered, and database/deploy impact assessed.
- Database commands that reset or migrate run only with explicit intent and a verified target; backend E2E must point to dedicated `taskgo_test`.
- Perform a findings-first review with `$code-review` and report fresh verification evidence or an explicit environmental blocker.
