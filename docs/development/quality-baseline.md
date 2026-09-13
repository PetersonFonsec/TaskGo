# Qualidade e escopo do CI

Auditoria iniciada em 12/09/2026 e integração verificada em 13/09/2026, com Node 22.23.2 e npm 10.9.8 no macOS. O [onboarding](onboarding-validation.md) inclui uma instalação limpa com `npm ci`; os testes dos worktrees também usaram dependências locais. A execução remota em Ubuntu permanece pendente.

## Verificações locais

| Verificação                                                          | Evidência observada                                                                   |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `npm run lint -- --skip-nx-cache`                                    | Lint backend aprovado; não altera arquivos                                            |
| `npx nx run shared:typecheck --skip-nx-cache`                        | TypeScript dos contratos compartilhados aprovado                                      |
| `npx nx run shared:test --skip-nx-cache`                             | 4 testes aprovados                                                                    |
| `npm run test:ci --workspace=apps/backend` com PostgreSQL 17 isolado | 72 suites aprovadas; 337 testes aprovados e 6 anteriormente ignorados                 |
| `npm run test:ci --workspace=apps/frontend`                          | 193 testes aprovados e 9 anteriormente ignorados; execução padrão com ordem aleatória |
| `npm run backoffice:test -- --skip-nx-cache`                         | 89 testes aprovados; cobertura de linhas 94,79%                                       |
| `npm run build -- --skip-nx-cache --parallel=1`                      | Build aprovado para backend, frontend, backoffice e landing page                      |

Nas execuções Nx foram usados `NX_DAEMON=false` e `NX_ISOLATE_PLUGINS=false`; Angular usou `NG_BUILD_MAX_WORKERS=2`. ChromeHeadless e workers Angular precisaram de execução fora do sandbox restrito. Os testes de banco usaram container descartável, sem conexão com o banco de desenvolvimento. Falhas iniciais por indisponibilidade do Docker foram superadas após iniciar o Docker Desktop e repetir as migrations e os testes.

## Correções aplicadas

- O lint backend usa explicitamente o flat config do ESLint 8, sem `--fix`. A correção automática continua disponível em `lint:fix`.
- `test:ci` executa Jest sequencialmente e Angular sem watch com ChromeHeadless.
- `shared:test` executa contratos Vitest existentes; `shared:typecheck` verifica TypeScript e contratos de tipos, preservando o nível de strictness existente.
- O desenvolvimento do backend não executa mais reset automático do banco. Migrations são uma etapa explícita do setup.
- Specs frontend foram atualizados para as APIs atuais, com HTTP simulado, providers de router, inputs e isolamento de armazenamento local adequados. Nenhum teste foi desabilitado nesta alteração.
- Busca e favoritos agora encerram o estado de carregamento também quando a requisição falha. O pipe de prestadores aceita dados ausentes sem lançar erro; os testes cobrem esses comportamentos.

## Workflow

[CI](../../.github/workflows/ci.yml) instala pelo lockfile, fornece PostgreSQL 17 descartável, gera Prisma Client, aplica migrations e executa as verificações listadas. O job se chama `Quality`. O [procedimento de proteção](branch-protection.md) exige confirmar esse check numa execução real antes da ativação.

O lint cobre somente backend. A landing page possui build, mas não suite de testes própria. Cypress, backend e2e separado e lint Angular não integram este gate inicial; as integrações presentes no Jest são executadas. Os 15 testes anteriormente ignorados permanecem visíveis e exigem triagem própria.

## Avisos e limites

- Builds Angular emitem avisos existentes de orçamento CSS e CommonJS (`leaflet`).
- Alguns testes usam URLs fictícias de imagens e geram avisos HTTP 404 de assets; não houve chamadas reais de API nos fixtures corrigidos.
- O ambiente pode emitir aviso de conflito entre `NO_COLOR` e `FORCE_COLOR`.
- A instalação reportou vulnerabilidades e dependências descontinuadas; os números observados e os limites estão no registro de onboarding. Não foi aplicado `npm audit fix`.
- Os resultados locais não comprovam aprovação do GitHub Actions, deploy, autenticação real ou pagamentos. Nenhum commit, PR ou deploy foi criado nesta implementação.
