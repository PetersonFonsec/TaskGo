# Correções de segurança — 30/09/2026

Base: commit 9d65efe; branch codex/security-hardening, preparada em worktree isolada.
As alterações locais anteriores, incluindo a migração de pagamentos, foram excluídas conforme solicitado.

| Achado | Correção preparada                                                                                                                                                                                                                 | Pendência ou limite                                                                                                                               |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| S01    | Credenciais retiradas do Git, exemplos sem segredos, produção exige chave JWT de 32 bytes em hexadecimal, HTTPS, sessão de 15 minutos e MFA administrativo.                                                                        | Rotação das credenciais e revogação das imagens antigas nos serviços reais ainda precisam ser realizadas. Remover arquivos não apaga o histórico. |
| S02    | Docker ignora arquivos de ambiente, logs e Git; imagem em múltiplas etapas e usuário sem privilégios.                                                                                                                              | Validar a imagem gerada; segredos são fornecidos em execução.                                                                                     |
| S03    | Limites compartilhados em PostgreSQL: 120 requisições/minuto/IP, 10 operações sensíveis/minuto/IP e 10 tentativas/15 minutos por e-mail. Retry-After e limpeza de contadores. TOTP administrativo com proteção contra repetição.   | Provisionar um segredo TOTP diferente por operador e definir os CIDRs dos proxies reais. Proteção volumétrica depende da infraestrutura.          |
| S04    | PATCH comum rejeita e-mail; alteração exige senha atual e código enviado ao novo endereço. Confirmação revoga sessões e notifica o endereço anterior.                                                                              | Validar SMTP em homologação.                                                                                                                      |
| S05    | Pelo menos 12 caracteres e no máximo 72 bytes UTF-8; rejeição de senhas comuns e caracteres repetidos; bcrypt custo 12. Cadastro, recuperação e administração protegidos.                                                          | A lista local de senhas comuns é limitada; não equivale a uma base completa de senhas vazadas.                                                    |
| S06    | Código aleatório, HMAC persistido, validade de 10 minutos, cinco tentativas, intervalo de um minuto para reenvio e consumo transacional. Entrega SMTP/Twilio sem fallback fixo.                                                    | Ausência de provedor configurado retorna 503. Entrega real ainda precisa ser validada.                                                            |
| S07    | Atualização de dependências, remoção de pacotes sem uso e correção de transitivos. Lockfile raiz como fonte de instalação.                                                                                                         | Audit e compatibilidade devem ser confirmados após a última alteração.                                                                            |
| S08    | Máximo de três reservas pendentes por cliente sob lock; expiração de 15 minutos, até 60 minutos após aprovação e varredura com reconciliação de cobranças.                                                                         | Tentativas com resultado desconhecido preservam a reserva e exigem reconciliação. Não são canceladas cegamente.                                   |
| S09    | Endpoint de alteração PIX não existe no commit base; pertence à migração local excluída.                                                                                                                                           | Corrigir na migração antes de publicá-la: senha atual/MFA, confirmação de ações financeiras e auditoria. Esta branch não corrige código ausente.  |
| S10    | Banco/observabilidade limitados a loopback, métricas com credencial e Swagger somente fora de produção. Headers nas interfaces.                                                                                                    | Configurar TLS/firewall no destino e validar exposição externa.                                                                                   |
| S11    | Cookies HttpOnly, Secure em produção, SameSite=Lax, Cache-Control no-store; JWT ausente das respostas HTTP e do localStorage. Origem validada nas escritas por cookie; logout revoga sessões. CSP em Nginx/SSR sem scripts inline. | API e aplicações precisam compartilhar o mesmo site HTTPS ou usar proxy reverso. Validar cookies/CSP no domínio final.                            |

Consultas de listagem foram limitadas a 100 registros; cobranças desconhecidas são rejeitadas antes de persistir eventos de webhook.

## Implantação

- Fazer backup e testar restauração antes das migrações.
- Rotacionar JWT, banco, gateway, CDN, SMTP e demais credenciais efetivamente usadas que tenham sido versionadas, compartilhadas ou incluídas em imagens. Conferir revogação nos provedores.
- Gerar JWT com openssl rand -hex 32 e armazenar no gerenciador de segredos; EXPIRES_IN=15m.
- Configurar PUBLIC_FRONTEND_ORIGINS, BACKOFFICE_FRONTEND_ORIGINS, ADMIN_INVITATION_URL e PASSWORD_RESET_FRONTEND_URL com HTTPS real.
- ADMIN_MFA_SECRETS é um objeto JSON de IDs administrativos para segredos aleatórios Base32 de pelo menos 32 caracteres. Um segredo por operador, sem versionamento.
- Configurar SMTP com TLS e remetente autenticado; configurar Twilio se a troca de telefone for disponibilizada. Validar entrega, expiração, reenvio, tentativas e aviso de alteração.
- Gerar METRICS_TOKEN aleatório e fornecer a mesma credencial ao coletor por arquivo secreto. Criar configurações locais a partir dos exemplos sem versioná-las.
- TRUST_PROXY_CIDRS deve incluir apenas proxies reais. Validar cabeçalhos falsificados e limites entre réplicas.
- Definir URLs reais de API/telemetria no frontend: a base contém endereços localhost de desenvolvimento.
- Validar login, cadastro, troca de contato, logout, MFA, reserva, PIX, reconciliação e estorno em homologação sem dinheiro real.
- Antes de incorporar a migração local de pagamentos, corrigir S09 nela.

## Verificacao final

Rodada executada apos as ultimas alteracoes de codigo, em 30/09/2026. Banco PostgreSQL descartavel em 127.0.0.1:55432, bases proxi_verify e taskgo_test. NODE_ENV=test e credenciais ficticias. As alteracoes anteriores do checkout original mantem o hash do backup inicial.

| Comando                                       | Saida / resultado                                                                                                                  | Exit |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ---- |
| `npm run lint --workspace apps/backend`       | Comando encerrado sem erro                                                                                                         | 0    |
| `npm run test:ci --workspace apps/backend`    | 85 suites passed; 444 passed, 6 skipped                                                                                            | 0    |
| `npm run build --workspace apps/backend`      | Comando encerrado sem erro                                                                                                         | 0    |
| `node docs/security/verify-http.cjs`          | PASS: real HTTP login, HttpOnly cookies, CSRF origin checks, customer/admin revocation, MFA replay and shared database rate limits | 0    |
| `npm run test:ci --workspace apps/frontend`   | TOTAL: 246 SUCCESS; 9 skipped                                                                                                      | 0    |
| `npm run build --workspace apps/frontend`     | ERROR: home.scss 9.20 kB > budget 8.00 kB                                                                                          | 1    |
| `npm run test --workspace apps/backoffice`    | TOTAL: 95 SUCCESS                                                                                                                  | 0    |
| `npm run build --workspace apps/backoffice`   | Comando encerrado sem erro                                                                                                         | 0    |
| `npm run build --workspace apps/landing-page` | Comando encerrado sem erro                                                                                                         | 0    |
| `npx nx run shared:typecheck --skip-nx-cache` | Comando encerrado sem erro                                                                                                         | 0    |
| `npx nx run shared:test --skip-nx-cache`      | 4 passed                                                                                                                           | 0    |
| `npm run test:e2e --workspace apps/backend`   | 13 suites passed; 99 passed                                                                                                        | 0    |
| `npm audit --json`                            | 0 vulnerabilities                                                                                                                  | 0    |

Os testes E2E foram alinhados aos contratos vigentes: especialidades validas, prestador aprovado, endereco do cliente, recebedor confirmado, PIX pendente sem confirmar pagamento, rejeicao de cartao e fotos indisponiveis. Webhooks consultam o gateway autenticado e deduplicam eventos pelo estado confirmado, ignorando IDs arbitrarios do corpo publico.

A imagem foi construida com `docker build --progress plain -t taskgo-security-check -f apps/backend/dockerfile .`. Inspecao: UID 1000, Prisma disponivel e ausencia de /app/.env, /app/apps/backend/.env e /app/apps/backend/.env.test.

O build de producao do frontend falha no limite de CSS da pagina inicial; esse arquivo nao foi alterado nesta branch. Ha tambem avisos de tamanho/CommonJS. Os testes exibem avisos de imagens ficticias e mensagens de erros deliberados de cenarios negativos. Os limites e avisos nao foram suprimidos.

Cypress nao foi executado nesta rodada. SMTP/Twilio, cookies Secure e CSP no dominio final precisam de homologacao. A verificacao HTTP local usa NODE_ENV=test, portanto sem o atributo Secure de producao.

A chave estrangeira de payment_attempts foi adicionada com NOT VALID para preservar possiveis registros historicos orfaos. Conferir/corrigir esses registros antes de executar `ALTER TABLE payment_attempts VALIDATE CONSTRAINT payment_attempts_order_id_fkey`.

## VERIFICATION REPORT

Claim: pipeline completo aprovado para commit/PR
Command: comandos da tabela, acrescidos de Prettier --check e git diff --check
Executed: apos as ultimas alteracoes de codigo, 30/09/2026
Exit code: 1 no build frontend; demais comandos da tabela: 0
Output summary: testes executados sem falhas; frontend home.scss 9.20 kB > 8.00 kB
Warnings: tamanho de bundles/CSS, CommonJS e logs de cenarios negativos
Errors: build frontend excede orçamento de CSS
Verdict: FAIL

Nenhuma aprovacao para publicacao e declarada. Rotacao das credenciais, configuracoes reais e S09 da migracao excluida continuam pendentes conforme a matriz. O usuario autorizou explicitamente abrir a PR em rascunho com o bloqueio documentado em 01/10/2026. Essa excecao permite commit/PR, sem aprovar merge ou publicacao.
