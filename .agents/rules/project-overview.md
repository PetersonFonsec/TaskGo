# Project Overview

- This repository is a private Nx monorepo named `taskgo-monorepo`.
- Main projects:
  - `apps/backend`: NestJS API with Prisma.
  - `apps/frontend`: Angular application with SSR, Storybook, and Cypress.
  - `libs/shared`: shared library for framework-neutral contracts and utilities.
- Prefer Nx entrypoints from the repository root when running project tasks:
  - `npm run backend`
  - `npm run frontend`
  - `npm run build`
  - `npm run test`
  - `npm run lint`
- Read the relevant `project.json` and package scripts before assuming how a target is executed.
- Keep changes scoped to the project or library that owns the behavior.
