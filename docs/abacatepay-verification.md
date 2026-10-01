# Validação da integração AbacatePay

Verificação em 01/10/2026 da branch `codex/abacatepay-pix`, baseada em
`b793a7d` de `origin/main`. Inclui somente as alterações de pagamentos;
os totais diferem da validação anterior da pasta de trabalho compartilhada.

```text
VERIFICATION REPORT
-------------------
Claim: Backend compila e passa no lint.
Command: npm --prefix apps/backend run build && npm --prefix apps/backend run lint
Executed: 2026-10-01, após os ajustes de integração com origin/main
Exit code: 0
Output summary: nest build; eslint "{src,apps,libs,test}/**/*.ts", sem diagnósticos
Warnings: none
Errors: none
Verdict: PASS
```

```text
VERIFICATION REPORT
-------------------
Claim: Suíte do frontend passa.
Command: NG_BUILD_MAX_WORKERS=2 npm --prefix apps/frontend run test:ci
Executed: 2026-10-01, após o último ajuste
Exit code: 0
Output summary: TOTAL: 248 SUCCESS; Executed 248 of 257 (skipped 9)
Warnings: 9 testes ignorados; 404 para imagens fictícias dos fixtures existentes
Errors: none
Verdict: PASS
```

```text
VERIFICATION REPORT
-------------------
Claim: Build de desenvolvimento do frontend passa.
Command: NG_BUILD_MAX_WORKERS=2 npm --prefix apps/frontend run build -- --configuration development
Executed: 2026-10-01, após o último ajuste
Exit code: 0
Output summary: Prerendered 14 static routes. Application bundle generation complete.
Warnings: none
Errors: none
Verdict: PASS
```

```text
VERIFICATION REPORT
-------------------
Claim: Suíte unitária e de integração do backend passa com PostgreSQL isolado.
Command: python3 /tmp/taskgo-push-verify.py node_modules/.bin/jest --runInBand --no-cache
Executed: 2026-10-01, após ajustar o teste ao construtor de origin/main
Exit code: 0
Output summary: Test Suites: 89 passed, 89 total; Tests: 6 skipped, 460 passed, 466 total
Warnings: 6 testes ignorados; log de falha SMTP intencional no teste de notificações
Errors: Nenhuma falha de teste
Verdict: PASS
```

## Reprodução e limites

Os testes de banco usam PostgreSQL 17 descartável, no endereço
`127.0.0.1:55432/taskgo_abacatepay_verify`, com migrations aplicadas por
`prisma migrate deploy`. `DATABASE_URL`, `PAYMENT_TEST_DATABASE_URL` e
`PROXI_TEST_DATABASE_URL` apontam para esse mesmo banco. O wrapper temporário
executa Jest em `apps/backend`, carrega a configuração local de testes, força
`NODE_ENV=test` e `PAYMENTS_SIMULATION=true` e limpa tokens de imagens.

- Testes com banco real cobrem concorrência, resposta perdida, destino congelado
  e rollback da intenção de repasse.
- A branch preserva o serviço de notificações já publicado em `origin/main`.
- Não houve chamada financeira real, execução dos E2E históricos nem build de
  produção nesta validação. Sandbox, webhook público e permissões da conta ainda
  precisam de homologação.
- Os avisos de imagens dos fixtures não são falhas das asserções.

Configuração, corte do Pagar.me e evolução para split estão descritos no
[guia de integração](./abacatepay-migration.md).
