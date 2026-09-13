# TaskGo

Monorepo com API NestJS (`apps/backend`), frontend Angular (`apps/frontend`), backoffice Angular (`apps/backoffice`), landing page Vite (`apps/landing-page`) e bibliotecas em `libs`.

## Pré-requisitos

- Git para clonar o repositório.
- Node.js **22.23.2**, fixado em `.nvmrc`. Se usar nvm: `nvm install` e `nvm use` na raiz.
- npm **10.9.8**, versão de referência do ambiente de desenvolvimento. Instale dependências na raiz com o lockfile do monorepo.
- Docker Engine/Desktop com daemon em execução e plugin **Docker Compose v2 ou superior**. O ambiente de referência tem Docker 29.5.2 e Compose 5.1.3.
- Portas locais disponíveis: 5432 (PostgreSQL), 3000 (API), 4200 (frontend), 4300 (backoffice) e 5173 (landing page).

Confira o ambiente com `node --version`, `npm --version`, `docker --version` e `docker compose version`. O PostgreSQL 17 é fornecido pelo Compose.

## Desenvolvimento

Siga o [guia de instalação e execução](docs/development/setup.md), incluindo configuração do ambiente e migrations. Consulte também o [registro de validação do onboarding](docs/development/onboarding-validation.md) para limitações verificadas.

## Contribuição e qualidade

Consulte o [fluxo de contribuição](CONTRIBUTING.md), o [quadro de trabalho](docs/development/board.md) e a [definição de pronto](docs/development/definition-of-done.md). A [auditoria de qualidade](docs/development/quality-baseline.md) descreve o escopo do CI e as limitações conhecidas.

Os procedimentos de [publicação](docs/operations/deploy.md) e [recuperação](docs/operations/rollback.md) registram os passos operacionais e as informações de infraestrutura ainda necessárias. O [acompanhamento das 16 tasks](docs/development/process-tasks.md) distingue as entregas locais das configurações remotas pendentes.
