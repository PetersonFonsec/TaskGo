# E2E do web (Cypress)

Duas camadas:

- **Com mocks** (`e2e/auth`, `e2e/cliente`, `e2e/conta`, `e2e/pedidos`, `e2e/prestador`): o front
  Angular real no navegador, com a API simulada por `cy.intercept`. Não precisa de backend nem banco.
  Roda em todo PR no job "E2E (mocks)".
- **Contra a API real** (`e2e/api-real`): backend com banco migrado e seed. Roda no job
  "Auth E2E (API real)".

`e2e/a-consertar` guarda os specs que quebraram com a migração das telas para o Design System
(busca, agendamento, favoritos e a navegação antiga). Eles não rodam no CI e saem dessa pasta
conforme forem reescritos.

## Como rodar

Na raiz do repositório, inicie o front:

```sh
npm run start -w apps/frontend
```

Em outro terminal:

```sh
npm run e2e:mocks -w apps/frontend        # suíte com mocks
npm run cypress:run:api -w apps/frontend  # contra a API real (precisa do backend em :3000)
npm run cypress:open -w apps/frontend     # modo interativo
```

Para outra porta: `-- --config baseUrl=http://localhost:4205`.

## Como escrever um spec

- **Sessão sem tela:** `cy.entrarComo('CLIENTE' | 'PRESTADOR', caminho, overrides?)` grava o token e
  o usuário no localStorage antes de a página carregar e registra o `stubBase`. Só os specs de
  autenticação entram pela tela de Entrar.
- **Mocks:** `support/api/fabricas.ts` tem uma fábrica por recurso, com só os campos que a API
  real envia (o prestador segue `public-provider.mapper.ts`, sem telefone nem e-mail).
  `support/api/stub-base.ts` responde ao que toda tela logada consulta. Para mudar uma resposta,
  registre outro `cy.intercept` depois: o último vence.
- **Seletores:** prefira papel e nome acessível com Testing Library
  (`cy.findByRole('button', { name: 'Confirmar conclusão' })`). Depois, os ids que as telas já têm.
  `data-testid` só onde não houver nome estável.
- **SSR:** as telas vêm renderizadas do servidor. Antes da hidratação, cliques e texto digitado
  se perdem. Espere um sinal de que o Angular assumiu a tela (na tela de Entrar, o foco no e-mail)
  antes de interagir.
- **Sem esperas fixas:** nada de `cy.wait(ms)`. Espere por alias (`cy.wait('@pedido')`) ou por
  estado da tela.
- **O que testar aqui:** rota, guarda, navegação entre telas e o corpo das requisições. Estados
  visuais de uma tela (carregando, vazio, erro) ficam nos testes unitários e no Storybook.

Falhas salvam capturas em `cypress/screenshots` (ignorado pelo Git).
