# Validação da integração AbacatePay

Verificação local em 25/09/2026. Não representa homologação na conta AbacatePay
nem autorização para movimentar dinheiro em produção.

```text
VERIFICATION REPORT
-------------------
Claim: Suíte unitária e de integração do backend passa com PostgreSQL isolado.
Command: python3 /tmp/taskgo-abacatepay-verify.py node_modules/.bin/jest --runInBand --no-cache
Executed: 2026-09-25, após criar e migrar o banco descartável
Exit code: 0
Output summary: Test Suites: 90 passed, 90 total; Tests: 6 skipped, 484 passed, 490 total
Warnings: 6 testes ignorados pela configuração existente
Errors: none
Verdict: PASS
```

O wrapper temporário executou Jest em `apps/backend` com `NODE_ENV=test`,
`PAYMENTS_SIMULATION=true` e `DATABASE_URL`, `PAYMENT_TEST_DATABASE_URL` e
`PROXI_TEST_DATABASE_URL` apontando exclusivamente para
`127.0.0.1:55432/taskgo_abacatepay_verify`. Tokens de imagens ficaram vazios.
O banco PostgreSQL 17 recebeu as migrations via `prisma migrate deploy` e foi
removido ao final. A primeira tentativa desta rodada encontrou o banco ausente;
o resultado acima corresponde à repetição completa após sua criação.

```text
VERIFICATION REPORT
-------------------
Claim: Backend compila e passa no lint.
Command: npm --prefix apps/backend run build && npm --prefix apps/backend run lint
Executed: 2026-09-25
Exit code: 0
Output summary: nest build; eslint "{src,apps,libs,test}/**/*.ts", sem diagnósticos
Warnings: none
Errors: none
Verdict: PASS
```

```text
VERIFICATION REPORT
-------------------
Claim: Suíte do frontend passa, incluindo recebimentos PIX e regressão do drawer.
Command: NG_BUILD_MAX_WORKERS=2 npm --prefix apps/frontend run test:ci
Executed: 2026-09-25, após o último ajuste e teste de regressão
Exit code: 0
Output summary: TOTAL: 260 SUCCESS; Executed 260 of 269 (skipped 9)
Warnings: 9 testes ignorados; respostas 404 para imagens fictícias dos fixtures
Errors: none
Verdict: PASS
```

A rodada inicial revelou um evento nativo de fechamento atrasado no drawer de
endereços. O componente agora ignora esse evento quando o diálogo já foi reaberto.
Foi acrescentado um teste determinístico para esse caso e repetida a suíte completa.

```text
VERIFICATION REPORT
-------------------
Claim: Build de desenvolvimento do frontend passa.
Command: NG_BUILD_MAX_WORKERS=2 npm --prefix apps/frontend run build -- --configuration development
Executed: 2026-09-25, após o ajuste do drawer
Exit code: 0
Output summary: Prerendered 14 static routes. Application bundle generation complete.
Warnings: none
Errors: none
Verdict: PASS
```

## Escopo e limites

- Gateway isolado por contrato e estratégia de repasse persistida por pagamento.
- Repasse condicionado à conclusão confirmada pelo cliente e ao recebimento conciliado.
- Testes com banco real cobrem concorrência, resposta perdida, destino congelado
  e rollback da intenção de repasse.
- Cadastro e consulta dos próprios recebimentos têm testes no frontend e backend.
- Nenhuma chamada financeira real foi executada. Sandbox, webhook público e
  permissões da conta ainda precisam de homologação.
- E2E históricos e build de produção não foram executados nesta validação.
- O build Nest passou; a checagem TypeScript abrangendo todos os specs teve,
  em rodada anterior, erros de tipagem fora de pagamentos e não compõe este PASS.

Configuração, corte do Pagar.me e evolução para split estão descritos no
[guia de integração](./abacatepay-migration.md).
