# Relatorio de Auditoria dos Servicos

Data da auditoria: 30 de maio de 2026

## Escopo

Auditoria transversal dos servicos backend e frontend, controllers, guards, interceptors, Prisma, configuracao e testes.

Nenhum arquivo de codigo-fonte foi alterado durante a analise.

## Canvas Executivo

| Area | Estado | Diagnostico |
| --- | --- | --- |
| Seguranca | Critico | API praticamente publica |
| Integridade | Critico | Preco e identidade do pedido controlados pelo cliente |
| Privacidade | Critico | Hashes e dados pessoais retornados em consultas |
| Servicos | Alto | CRUDs incompletos e fluxos inconsistentes |
| Testes | Alto | Pipelines backend e frontend quebrados |
| Build | Atencao | Compila, mas nao garante comportamento correto |

## Achados Criticos

### 1. Autorizacao nao aplicada no backend

O `AuthGuard` existe em [`apps/backend/src/modules/auth/auth.guard.ts`](apps/backend/src/modules/auth/auth.guard.ts#L9), mas nao e registrado globalmente nem usado nos controllers.

Qualquer cliente pode listar, alterar e excluir usuarios, enderecos e pedidos por rotas como:

- [`apps/backend/src/modules/user/user.controller.ts`](apps/backend/src/modules/user/user.controller.ts#L35)
- [`apps/backend/src/modules/order/order.controller.ts`](apps/backend/src/modules/order/order.controller.ts#L23)

**Impacto:** acesso e modificacao nao autorizados de dados.

**Recomendacao:** aplicar autenticacao global ou `@UseGuards(AuthGuard)` nas rotas protegidas e derivar o usuario autenticado do token.

### 2. Pedido aceita fraude de identidade e preco

`clientId`, `serviceId` e `finalPrice` vem diretamente do payload em [`apps/backend/src/modules/order/order.service.ts`](apps/backend/src/modules/order/order.service.ts#L21).

**Impacto:** um cliente pode criar pedidos para outro usuario e sobrescrever o preco base.

**Recomendacao:** derivar `clientId` do token, calcular o preco no servidor e validar transicoes de pagamento.

### 3. Consultas expoem dados sensiveis

Alguns includes retornam objetos Prisma completos, incluindo campos como `passwordHash`, CPF e email:

- [`apps/backend/src/modules/provider/provider.service.ts`](apps/backend/src/modules/provider/provider.service.ts#L34)
- [`apps/backend/src/modules/order/order.service.ts`](apps/backend/src/modules/order/order.service.ts#L92)
- [`apps/backend/src/modules/order/order.service.ts`](apps/backend/src/modules/order/order.service.ts#L137)

**Impacto:** vazamento de credenciais derivadas e dados pessoais.

**Recomendacao:** usar `select` explicito ou DTOs de resposta com allowlist de campos.

### 4. Enderecos vazam entre usuarios

O frontend envia `userId`, mas o backend ignora o filtro em [`apps/backend/src/modules/address/address.controller.ts`](apps/backend/src/modules/address/address.controller.ts#L17).

A criacao tambem descarta `userId`, `label`, `lat` e `lng` em [`apps/backend/src/modules/address/address.service.ts`](apps/backend/src/modules/address/address.service.ts#L18).

**Impacto:** listagem cruzada de enderecos e registros incompletos.

**Recomendacao:** filtrar pelo usuario autenticado e persistir os campos validados.

## Achados Altos

### 5. Cadastro pelo frontend esta incompativel com a API

O frontend envia `{ user: data }` em [`apps/frontend/src/app/shared/service/users/user-register.ts`](apps/frontend/src/app/shared/service/users/user-register.ts#L29), enquanto o backend espera os campos na raiz em [`apps/backend/src/modules/auth/auth.controller.ts`](apps/backend/src/modules/auth/auth.controller.ts#L35).

**Impacto:** cadastro pela interface pode falhar na validacao.

### 6. Criacao de categoria responde antes da transacao

A Promise de `$transaction()` nao e retornada nem aguardada em [`apps/backend/src/modules/categories/categories.service.ts`](apps/backend/src/modules/categories/categories.service.ts#L18).

**Impacto:** falhas podem ocorrer depois de uma resposta de sucesso.

### 7. CRUD de servicos e providers ainda e scaffold

Operacoes retornam textos sem persistencia:

- [`apps/backend/src/modules/services/services.service.ts`](apps/backend/src/modules/services/services.service.ts#L25)
- [`apps/backend/src/modules/provider/provider.service.ts`](apps/backend/src/modules/provider/provider.service.ts#L87)

**Impacto:** endpoints respondem sem executar a operacao solicitada.

### 8. DTO de subcategoria conflita com o schema

`categoryId` Prisma e `BigInt`, mas o DTO exige UUID e ainda obriga o cliente a informar um ID sobrescrito pelo servico:

- [`apps/backend/src/modules/categories/dto/create-subcategory.dto.ts`](apps/backend/src/modules/categories/dto/create-subcategory.dto.ts#L5)

**Impacto:** payloads validos para o banco podem ser rejeitados pela API.

## Achados Medios

### 9. Paginacao aceita campos arbitrarios

`sortBy`, `limit` e chaves de busca entram diretamente na consulta Prisma em [`apps/backend/src/shared/services/pagination/pagination.service.ts`](apps/backend/src/shared/services/pagination/pagination.service.ts#L45).

`take: -limit` tambem inverte a direcao esperada da pagina.

**Impacto:** erros de consulta, comportamento inesperado e potencial abuso de recursos.

**Recomendacao:** validar limites e usar allowlist de campos pesquisaveis e ordenaveis.

### 10. Recuperacao de senha esta incompleta

O handler publica `ForgotPasswordEvent`, mas nao existe consumidor registrado nem endpoint de redefinicao:

- [`apps/backend/src/modules/auth/commands/forgot-password/forgot-password.handle.ts`](apps/backend/src/modules/auth/commands/forgot-password/forgot-password.handle.ts#L19)

**Impacto:** fluxo iniciado sem conclusao funcional.

### 11. Credenciais versionadas

Ha senha de banco e segredo JWT rastreados:

- [`config/db.env`](config/db.env#L1)
- [`config/backend.env`](config/backend.env#L1)

**Impacto:** incentivo a reutilizacao insegura e risco de exposicao de ambientes.

**Recomendacao:** versionar apenas exemplos sem valores e rotacionar segredos reutilizados.

### 12. Inicializacao dev destrutiva

`start:dev` executa `prisma migrate reset --force`:

- [`apps/backend/package.json`](apps/backend/package.json#L15)

**Impacto:** perda de dados ao iniciar o ambiente local.

**Recomendacao:** remover o reset automatico e deixa-lo como comando explicito.

## Cobertura Da Analise

- 15 classes de servico e handlers do backend revisados.
- Servicos HTTP, armazenamento local, guards e interceptors do frontend revisados.
- Controllers, DTOs, Prisma schema e configuracoes de ambiente inspecionados.

## Aspectos Positivos

- DTOs de pedidos usam validacao aninhada.
- Operacoes compostas de pedido usam transacao Prisma.
- O build Nx compila backend e frontend.
- O frontend possui interceptor para envio de token.

## Verificacao Executada

### Lint

```text
Claim: estado atual do lint
Command: npm run lint -- --skip-nx-cache
Exit code: 1
Output summary: 242 problemas, 214 erros e 28 warnings
Verdict: FAIL
```

### Build

```text
Claim: compilacao do monorepo
Command: npm run build -- --skip-nx-cache
Exit code: 0
Output summary: backend e frontend compilados; 2 warnings Angular
Verdict: PASS
```

### Testes Frontend

```text
Claim: testes frontend
Command: npm run test -- --watch=false --browsers=ChromeHeadless
Exit code: 1
Output summary: falhas em imports SCSS e testes desatualizados
Verdict: FAIL
```

### Testes Agregados

```text
Claim: testes do monorepo
Command: npm run test -- --skip-nx-cache --runInBand
Exit code: nao concluido integralmente
Output summary: backend falhou em 15 suites; frontend entrou em modo continuo e foi encerrado
Verdict: FAIL
```

## Ordem Recomendada De Correcao

1. Aplicar autenticacao e autorizacao no backend.
2. Remover controle de identidade e preco do payload de pedidos.
3. Criar DTOs de resposta sem dados sensiveis.
4. Corrigir isolamento e persistencia de enderecos.
5. Alinhar contrato de cadastro entre frontend e backend.
6. Implementar CRUDs que ainda retornam placeholders.
7. Corrigir lint e infraestrutura de testes.
8. Remover segredos versionados e inicializacao destrutiva.

## Observacao Sobre A Arvore De Trabalho

Durante a auditoria, `todo.txt` apresentou uma alteracao externa. Essa alteracao foi preservada e nao faz parte deste relatorio.
