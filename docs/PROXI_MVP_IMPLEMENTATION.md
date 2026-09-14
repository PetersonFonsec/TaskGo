# Proxi — implementação do plano de MVP

Atualizado em 14/09/2026. Complementa `PROXI_MVP_AUDIT.md`, que preserva a análise anterior às mudanças. As alterações estão no workspace, sem commit ou deploy. O produto ainda não está liberado para soft launch.

## Recorte aplicado

PIX, preço fixo contratado e ofertas com agenda semanal. Cartão, reajuste de preço e fotos em base64 foram desabilitados. Cadastros novos criam ofertas inativas próprias a partir de especialidades; aprovação administrativa continua obrigatória. Sessões emitidas antes da separação de tipos de JWT precisam de novo login.

## Situação por task da auditoria

“Implementado” identifica o escopo entregue no código, não homologação externa nem aprovação de lançamento.

| Task | Situação | Entrega / pendência |
|---|---|---|
| 001 | Implementado | Projeções públicas sem senha, CPF, contatos, recipients e histórico privado; avaliações públicas limitadas a nota/comentário/data. |
| 002 | Implementado | Conta somente do titular; campos protegidos excluídos do PATCH; diretório e exclusão física bloqueados. Encerramento/anomização de conta fica pendente. |
| 003 | Implementado | Pedidos exigem participação e usam identidade da sessão. |
| 004 | Implementado | Mutação genérica, reagendamento arbitrário e remoção de histórico desabilitados. |
| 005 | Implementado | JWT customer/admin separados; interceptor restrito à API. |
| 006 | Implementado | Cadastro com payload direto compatível com DTO. |
| 007 | Implementado | `subcategoryIds` cria ofertas próprias inativas, sem apropriar serviços alheios. |
| 008 | Implementado | Gestão de ofertas do prestador, preço, categoria, ativação e janelas semanais validadas. |
| 009 | Implementado | Descoberta/contratação/lifecycle exigem prestador aprovado. |
| 010 | Implementado | Seleção de serviço/endereço próprio; preço e snapshot calculados no backend. |
| 011 | Parcial | Reserva serializada por prestador, intervalo persistido e teste PostgreSQL concorrente. Falta política de expiração/liberação de reserva abandonada. |
| 012 | Implementado | Deslocamento e início explícitos com estado e pagamento PIX validado. |
| 013 | Parcial | Corpo do webhook não decide estado financeiro; consulta autenticada confirma cobrança/pedido/valor. A origem do remetente ainda não é autenticada por credencial/assinatura. |
| 014 | Parcial | Tentativa/request/chave imutáveis antes do gateway; retries até 4 minutos. Tentativa ambígua após essa janela exige reconciliação operacional. |
| 015 | Implementado localmente | Estados canônicos e coordenação Order/Payment; PIX pendente não agenda. Falta homologação Pagar.me. |
| 016 | Parcial | Webhooks desconhecidos ficam pendentes e retornam erro para retry; consulta de pagamento reconcilia. Falta worker/reconciliação operacional de tentativas sem charge persistida. |
| 017 | Parcial | Operações financeiras serializadas e confirmação protegida; validação local. Falta homologação de falhas/retentativas reais. |
| 018 | Implementado | Preço fixo; valor final e pagamento precisam coincidir. |
| 019 | Parcial | Cancelamento consulta estado canônico/reembolso e bloqueia casos ambíguos. Falta operação assistida e homologação de reembolso. |
| 020 | Pendente externo e código | Checkout exige profile READY/CONFIRMED + recipient. Provisionamento/sincronização real de recipient ainda não entregue. Não alterar flags manualmente para contornar. |
| 021 | Fora do recorte | Cartão desabilitado; tokenização ainda não entregue. |
| 022 | Parcial | Consulta PIX periódica/manual e QR expirado bloqueado. Renovação de cobrança e conciliação após timeout ainda pendentes. |
| 023 | Implementado | Dashboard consultado na entrada e após ações, sem dados fictícios, com loading/erro/vazio. Agregação lê histórico completo; otimização posterior. |
| 024 | Parcial | Recuperação de senha com SMTP configurável, hash, validade 30min, uso único, revogação de sessão e rate limit. Avisos de pedido, verificação real de contatos e entrega SMTP ainda pendentes. |
| 025 | Parcial | Formulário/casos por pedido, autor autenticado, bloqueio de conclusão com caso aberto; API administrativa registra resolução, data e operador. Falta tela operacional no backoffice e fluxo assistido de reembolso. |
| 026 | Implementado | Cobertura geográfica parametrizada por raio ativo; fronteira testada em PostgreSQL. Sem coordenadas, navegação mostra ofertas com área configurada; contratação sempre revalida endereço. Edição de área pelo prestador ainda pendente. |
| 027 | Parcial | Avaliações públicas recuperadas sem expor cliente/pedido; regras existentes de avaliação mantidas. Retentativa/rating concorrente exige revisão específica. |
| 028 | Parcial | Escritas de categoria exigem admin/capability; transação aguardada; remoção inativa. Conclusão de convites administrativos pendente. |
| 029 | Parcial | Produção rejeita pagamentos simulados; seed demo opt-in e proibido em produção. URLs finais, bootstrap admin, infraestrutura e deploy pendentes. |
| 030 | Parcial | Suítes unitárias/integração e teste PostgreSQL de concorrência. Gate E2E completo navegador/API/gateway real ainda não entregue. |
| 031 | Implementado no recorte | Upload de fotos removido da conclusão; API rejeita fotos. Preço fixo readonly na UI. |
| 032 | Parcial | Transições principais registram eventos reais; eventos sintéticos de detalhes removidos. Casos de suporte possuem registro próprio. Revisão completa de semântica financeira do histórico ainda pendente. |
| 033 | Parcial | Recuperação e reporte de problema agora têm destinos funcionais. Landing e demais entradas precisam revisão final. |

## Configuração e operação

1. Aplicar migrations pelo fluxo normal de deploy, após backup e revisão. Nesta execução somente o PostgreSQL temporário de testes recebeu as migrations.
2. Novas migrations: `202609130002_payment_integrity`, `20260913001000_order_interval`, `202609140030_account_recovery`, `202609140040_order_disputes`.
3. Recuperação: `SMTP_URL`, `MAIL_FROM`, `PASSWORD_RESET_FRONTEND_URL`. O último deve apontar para `/authenticate/reset-password`, com HTTPS em produção. Token vai no fragmento do link e somente o hash é persistido. Nenhum e-mail real foi enviado durante os testes.
4. Limite de recuperação: 5 solicitações por IP/minuto e 1 entrega por conta/minuto. O limite de IP é local à instância; ao escalar, configurar limite compartilhado no proxy. Senhas de recuperação exigem 10 caracteres e no máximo 72 bytes para evitar truncamento bcrypt.
5. Suporte: `POST/GET /orders/:id/disputes`; operação administrativa `GET /admin/disputes` e `POST /admin/disputes/:id/resolve`, com `status` RESOLVED/REJECTED e `resolution`. Administrador e suporte têm capability. Resolver um caso não movimenta dinheiro.
6. Financeiro: homologar recipient, conta, split, PIX pago/expirado, cancelamento, retorno perdido e webhook adiantado. A simulação local não comprova integração e não permite dinheiro fictício em produção.
7. Não executar `prisma migrate reset` em banco existente. Os testes desta entrega usam `proxi_verify` em contêiner temporário, sem volume do projeto.

## Limitações relevantes

- Nenhuma chamada financeira real, publicação, commit ou envio de mensagem a terceiros foi feito.
- Taxonomia e agenda mínimas estão disponíveis, mas reservas abandonadas ainda podem bloquear horários.
- O fluxo de suporte interrompe a confirmação, não garante retenção bancária de um PIX já pago.
- Migrations históricas são testadas antes de aplicar migrations posteriores; testes de aplicação corrente usam o schema corrente.
- Os testes sandbox ignorados e testes frontend previamente ignorados permanecem identificados nos resultados; não contam como validação executada.

## Evidências de verificação — 14/09/2026

VERIFICATION REPORT
-------------------
Claim: Suíte backend passa no PostgreSQL isolado após as mudanças.
Command: `DATABASE_URL='postgresql://proxi_verify:isolated_test_only@127.0.0.1:55439/proxi_verify' PROXI_TEST_DATABASE_URL='postgresql://proxi_verify:isolated_test_only@127.0.0.1:55439/proxi_verify' npm test --workspace apps/backend -- --runInBand`
Executed: Após integração de recuperação, suporte, agenda e pagamentos.
Exit code: 0
Output summary: `Test Suites: 81 passed, 81 total`; `Tests: 6 skipped, 409 passed, 415 total`.
Warnings: 6 cenários externos ignorados; nenhum gateway real chamado.
Errors: none
Verdict: PASS

VERIFICATION REPORT
-------------------
Claim: Suíte frontend passa.
Command: `NG_BUILD_MAX_WORKERS=2 npm test --workspace apps/frontend -- --watch=false --browsers=ChromeHeadless`
Executed: Após as alterações de telas e contratos.
Exit code: 0
Output summary: `TOTAL: 198 SUCCESS`; 9 testes ignorados.
Warnings: Testes ignorados não executados.
Errors: none
Verdict: PASS

VERIFICATION REPORT
-------------------
Claim: Builds backend e frontend passam.
Command: `npm run build --workspace apps/backend`; `NG_BUILD_MAX_WORKERS=2 npm run build --workspace apps/frontend`
Executed: Após as últimas alterações de código/template e configuração de rotas SSR.
Exit code: 0, 0
Output summary: `nest build`; `Output location: apps/frontend/dist/frontend`.
Warnings: Angular: bundle inicial 708,60 kB acima do aviso de 500 kB, 7 estilos acima do aviso de 4 kB e Leaflet CommonJS. Nenhum orçamento de erro ultrapassado.
Errors: none
Verdict: PASS

Também verificados: compilação TypeScript do backoffice, `git diff --check`, 25 migrations aplicadas somente no banco temporário. O teste de concorrência e raio usa PostgreSQL real e confirmou reserva única entre dois serviços do mesmo prestador e fronteiras de 9,999/10,001 km para área de 10 km. Uma falha real de desserialização do retorno `void` dos advisory locks foi reproduzida e corrigida com `::text`.

Estas evidências não substituem a jornada E2E completa nem a homologação de pagamentos, SMTP, recipients ou operação de suporte. O projeto ainda não está pronto para soft launch.


VERIFICATION REPORT
-------------------
Claim: Lint do backend passa sem correções automáticas pendentes.
Command: `npm run lint --workspace apps/backend`
Executed: Após as alterações finais.
Exit code: 0
Output summary: ESLint encerrado sem diagnósticos.
Warnings: none
Errors: none
Verdict: PASS
