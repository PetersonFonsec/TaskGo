# Backend refactoring baseline

Baseline da Entrega 1, levantado em 2026-08-02. Este documento registra o estado anterior às refatorações funcionais e deve ser atualizado somente quando um novo baseline for deliberadamente estabelecido.

## Escopo observado

- Aplicação NestJS em `apps/backend`.
- Persistência Prisma/PostgreSQL.
- Testes unitários Jest em `apps/backend/src`.
- Testes HTTP e de integração em `apps/backend/test`.
- Build, testes e lint expostos como targets Nx no projeto `backend`.

## Comandos oficiais

Executar a partir da raiz do monorepo:

```sh
./node_modules/.bin/nx build backend --skip-nx-cache
./node_modules/.bin/nx test backend --skip-nx-cache -- --runInBand
./node_modules/.bin/nx run backend:test-e2e --skip-nx-cache
```

O script `lint` do backend contém `--fix`. Para uma verificação que não altere arquivos, executar a partir de `apps/backend`:

```sh
./node_modules/.bin/eslint "{src,apps,libs,test}/**/*.ts"
```

## Resultado do baseline neste ambiente

| Verificação      | Resultado               | Evidência                                                                                                                |
| ---------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Build            | Bloqueado pelo ambiente | `node` e `npx` não estão disponíveis no `PATH`; o binário Nx instalado falha com `env: node: No such file or directory`. |
| Testes unitários | Bloqueado pelo ambiente | Mesmo bloqueio do runtime Node.                                                                                          |
| Lint sem escrita | Bloqueado pelo ambiente | Mesmo bloqueio do runtime Node.                                                                                          |
| Testes E2E       | Não executados          | Dependem do runtime Node e de PostgreSQL de teste; o runner também executa reset do banco `taskgo_test`.                 |

Esses resultados não representam falhas do código. Nenhuma alegação de build ou testes aprovados deve ser feita até uma execução fresca em um ambiente com Node e PostgreSQL de teste disponíveis.

## Estado de proteção existente

Há cobertura E2E dedicada para:

- autenticação de clientes, prestadores e operadores administrativos;
- autorização administrativa e auditoria;
- cadastro e ownership de endereços;
- jornada de reserva do cliente;
- ciclo de vida completo do pedido;
- pagamento, webhook e idempotência;
- gestão administrativa de usuários e prestadores.

Os testes de caracterização desta entrega complementam essa cobertura nas fronteiras de delegação do controller de pedidos. A matriz completa está em [backend-test-coverage.md](./backend-test-coverage.md).

## Condições para iniciar mudanças funcionais

1. Executar build e testes unitários com sucesso, ou registrar falhas preexistentes.
2. Subir PostgreSQL de teste e confirmar que `DATABASE_URL` aponta para `taskgo_test`.
3. Executar E2E sem usar credenciais ou banco de desenvolvimento.
4. Guardar o resultado dos comandos na descrição da próxima entrega.
