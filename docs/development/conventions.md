# Convenções de desenvolvimento

## Onde colocar código

| Diretório                        | Responsabilidade                                                                |
| -------------------------------- | ------------------------------------------------------------------------------- |
| `apps/backend/src/modules/`      | Funcionalidades da API NestJS: módulos, controllers, DTOs, serviços e handlers. |
| `apps/backend/src/shared/`       | Recursos compartilhados internamente pela API.                                  |
| `apps/backend/src/prisma/`       | Schema, migrations e seeds do Prisma.                                           |
| `apps/frontend/src/app/modules/` | Funcionalidades da aplicação Angular voltada ao usuário.                        |
| `apps/frontend/src/app/shared/`  | Recursos reutilizados dentro do frontend.                                       |
| `apps/backoffice/src/app/`       | Aplicação Angular de administração.                                             |
| `apps/landing-page/`             | Landing page servida e compilada com Vite.                                      |
| `libs/shared/src/`               | Contratos e recursos compartilhados entre projetos.                             |
| `config/` e `scripts/`           | Configurações e automações do repositório.                                      |

Siga a estrutura do módulo que está alterando. O backend possui módulos com
serviços e módulos com commands/queries; preserve a organização local e explique
mudanças de arquitetura. Valide entradas nos DTOs e mantenha regras de negócio
fora dos controllers quando o módulo já as concentra em serviços ou handlers.

Compartilhe em `libs/shared` apenas o que tem uso entre projetos. Evite importar
implementações de uma aplicação em outra; use os contratos e aliases existentes
em `tsconfig.base.json`. Alterar um contrato compartilhado exige verificar seus
consumidores.

## Estilo e dependências

- Preserve o estilo dos arquivos próximos e as configurações de Prettier e
  ESLint do projeto. A configuração Prettier da raiz usa aspas simples.
- Use os scripts de `package.json` e os targets de `project.json`; um target Nx
  só valida os projetos que o possuem.
- Instale dependências no workspace apropriado e inclua a atualização do
  `package-lock.json` da raiz. Explique a necessidade de novas dependências.
- Edite fontes TypeScript, evitando alterações manuais em arquivos gerados.
- Mantenha segredos fora do Git e documente novas variáveis no exemplo de ambiente.

## Testes e dados

Os testes unitários do backend usam Jest e arquivos `*.spec.ts`. Os aplicativos
Angular possuem suas próprias configurações de teste; há também testes Cypress
e testes em bibliotecas compartilhadas. Consulte o target do projeto alterado.
Adicione testes de comportamento proporcionais ao risco, especialmente para
correções de regressão, autorização e regras de negócio.

Mantenha migrations versionadas junto a mudanças de schema. Use um banco
exclusivo para testes de integração: os scripts E2E do backend executam reset do
banco de teste. Não execute comandos de reset em bases com dados a preservar.

## Decisões e referência

Consulte os [documentos de refatoração](../refactoring/) e os
[artefatos de funcionalidades](../../.compozy/tasks/) relacionados à mudança.
Eles registram contexto por iniciativa; confira a implementação atual antes de
aplicar uma decisão antiga. Registre novas decisões relevantes na documentação
da funcionalidade, explicando problema, escolha e consequências.
