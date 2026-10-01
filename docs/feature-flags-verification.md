# Feature flags no backoffice

A rota `/feature-flags` permite listar, criar, editar, habilitar, desabilitar e excluir registros, com confirmação de exclusão e paginação. O acesso exige o perfil ADMINISTRATOR tanto na interface quanto na API `/admin/feature-flags`. Novas flags começam desabilitadas. Nome é obrigatório; descrição é opcional e pode ser limpa.

A implementação usa a tabela FeatureFlag existente, sem migração. O cadastro persiste o status no banco; não conecta automaticamente funcionalidades a esse status. Favoritos ainda consulta a configuração de ambiente existente.

## Verificação em 20/09/2026

```text
VERIFICATION REPORT
-------------------
Claim: Testes completos do backoffice passam
Command: CI=true npm test --workspace apps/backoffice
Executed: Após as alterações finais
Exit code: 0
Output summary: TOTAL: 101 SUCCESS; Statements 93.78%; Branches 82.83%
Warnings: Cache nativo desativado com CI=true após SIGABRT do LMDB; Karma executado com permissão para abrir porta local
Errors: none
Verdict: PASS
```

```text
VERIFICATION REPORT
-------------------
Claim: Testes de feature flags do backend passam
Command: npm test --workspace apps/backend -- --runInBand feature-flag
Executed: Após as alterações finais
Exit code: 0
Output summary: Test Suites: 4 passed, 4 total; Tests: 12 passed, 12 total
Warnings: none
Errors: none
Verdict: PASS
```

```text
VERIFICATION REPORT
-------------------
Claim: Builds de backend e backoffice passam
Command: npm run build --workspace apps/backoffice; npm run build --workspace apps/backend
Executed: Após as alterações de implementação
Exit code: 0 em ambos
Output summary: Application bundle generation complete; nest build concluído sem erros
Warnings: none
Errors: none
Verdict: PASS
```

```text
VERIFICATION REPORT
-------------------
Claim: Formatação e lint dos arquivos alterados passam
Command: npx prettier --check apps/backend/src/feature-flag apps/backend/src/modules/admin/authorization/admin-permissions.ts apps/backoffice/src/app/features/feature-flags apps/backoffice/src/app/app.routes.ts apps/backoffice/src/app/core/navigation/admin-navigation.ts apps/backoffice/src/app/core/navigation/admin-navigation.spec.ts
Command: cd apps/backend && npx eslint src/feature-flag/**/*.ts src/modules/admin/authorization/admin-permissions.ts
Executed: Após as alterações finais
Exit code: 0 em ambos
Output summary: All matched files use Prettier code style!; ESLint sem saída de erro
Warnings: none
Errors: none
Verdict: PASS
```

```text
VERIFICATION REPORT
-------------------
Claim: Suíte completa do backend passa
Command: npm test --workspace apps/backend -- --runInBand
Executed: Nesta validação
Exit code: 1
Output summary: Test Suites: 12 failed, 1 skipped, 72 passed; Tests: 32 failed, 8 skipped, 415 passed
Warnings: Há alterações concorrentes em outras áreas do workspace
Errors: Falhas em integração/banco/portas e em testes de pagamentos, conclusão de pedidos, configuração e schema; nenhuma suíte de feature flags falhou
Verdict: FAIL
```

A validação global do backend permanece pendente. Não foi realizado deploy nem teste com banco real para este CRUD.
