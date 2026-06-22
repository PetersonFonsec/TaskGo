---
status: completed
title: Implementar tela 404 visual e responsiva
type: frontend
complexity: low
dependencies: []
---

# Task 1: Implementar tela 404 visual e responsiva

## Requirements

- Ler PRD e TechSpec antes da implementação.
- Atualizar HTML, SCSS e TS do componente 404.
- Usar a ilustração existente.
- Adicionar atalhos navegáveis e bloco de ajuda.
- Atualizar testes do componente.
- Verificar com teste ou build do frontend.

## Subtasks

- [x] 1.1 Atualizar modelo de dados e imports do componente.
- [x] 1.2 Implementar markup da tela 404.
- [x] 1.3 Implementar SCSS responsivo.
- [x] 1.4 Atualizar testes.
- [x] 1.5 Executar verificação.

## Verification

- `npm run build --workspace frontend` passou com exit code 0 após as alterações.
- `npm run test --workspace frontend -- --watch=false` falhou antes de executar a suíte por erros TypeScript em specs existentes fora desta tela, incluindo `jest.fn()` em specs Jasmine e APIs divergentes em `card-detail.spec.ts` e `mask.directive.spec.ts`.

## Relevant Files

- `apps/frontend/src/app/modules/common/not-found/not-found.ts`
- `apps/frontend/src/app/modules/common/not-found/not-found.html`
- `apps/frontend/src/app/modules/common/not-found/not-found.scss`
- `apps/frontend/src/app/modules/common/not-found/not-found.spec.ts`
