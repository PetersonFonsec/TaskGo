# API do TaskGo no Railway

Use o serviço da API e o PostgreSQL existentes no mesmo projeto e ambiente. O GitHub entrega o código da branch `main`. O Railway constrói a imagem, executa as migrations e troca a versão após o teste de prontidão. O domínio temporário do Railway atende ao primeiro deploy.

## Configuração do serviço da API

| Campo | Valor |
|---|---|
| Source / Branch | `PetersonFonsec/TaskGo` / `main` |
| Root Directory | Raiz do repositório (`/`, padrão) |
| Builder / Dockerfile Path | Dockerfile / `Dockerfile` na raiz, detectado automaticamente |
| Build Command / Start Command | Deixar ambos vazios. A imagem compila o workspace e inicia `node dist/apps/backend/src/main.js` em `/app/apps/backend` |
| Pre-deploy Command | `npm run prisma:deploy` |
| Healthcheck Path / Timeout | `/health` / 120 segundos |
| Restart Policy | On Failure, até 3 tentativas |
| Réplicas | 1 inicialmente. Há tarefas periódicas e a verificação de contato guarda códigos em memória |
| Drenagem | Variável de plataforma `RAILWAY_DEPLOYMENT_DRAINING_SECONDS=30` para dar tempo ao SIGTERM |
| Wait for CI | Ativado para os pushes na `main` |
| Watch Paths | Uma entrada por linha: `/apps/backend/**`, `/libs/shared/**`, `/package.json`, `/package-lock.json`, `/tsconfig.base.json`, `/Dockerfile`, `/.dockerignore` |

O Dockerfile na raiz usa o lockfile do monorepo, o workspace Nest e os contratos TypeScript de `libs/shared`. O Dockerfile em `apps/backend/dockerfile` pertence ao fluxo antigo de desenvolvimento. As configurações de serviço da tabela são aplicadas no painel, evitando vincular um manifesto de infraestrutura a nomes de serviços ainda desconhecidos. [Build de monorepos](https://docs.railway.com/builds/build-configuration) · [Dockerfiles](https://docs.railway.com/builds/dockerfiles) · [Política de reinício](https://docs.railway.com/deployments/restart-policy)

## Variáveis da API

Os exemplos com `.invalid` ilustram o formato. Use as origens HTTPS reais que você controla, inclusive as URLs temporárias da Vercel. As duas listas de origens são exigidas pelo validador de produção mesmo antes de os dois clientes estarem publicados. Use uma origem fechada e reservada, como `https://backoffice.invalid`, para um cliente ainda indisponível, substituindo-a quando houver uma URL real. A aplicação mobile nativa e as sondas sem cabeçalho Origin continuam sujeitas à autenticação das rotas.

| Variável | Obrigatória | Finalidade | Exemplo ou padrão |
|---|---|---|---|
| NODE_ENV | Sim, na imagem | Ativa validação de produção e logs JSON | `production` |
| PORT | Plataforma | Porta HTTP de escuta em todas as interfaces | Railway injeta. Localmente, `3000` |
| DATABASE_URL | Sim, segredo | PostgreSQL privado, usado por Prisma e pelo pre-deploy | `${{Postgres.DATABASE_URL}}` se o serviço se chamar Postgres |
| JWT_SECRET | Sim, segredo | Assinatura dos tokens da API e do backoffice | Gerar valor aleatório, por exemplo com `openssl rand -hex 32`, e guardar nas Variables |
| PUBLIC_FRONTEND_ORIGINS | Sim | Origens exatas do frontend, separadas por vírgula | `https://app.example.invalid` |
| BACKOFFICE_FRONTEND_ORIGINS | Sim | Origens exatas do backoffice | `https://admin.example.invalid` |
| ABACATEPAY_API_KEY | Sim, segredo | Autenticação no gateway | Chave de produção do provedor |
| ABACATEPAY_WEBHOOK_SECRET | Sim, segredo | Validação do webhook de pagamentos | Segredo correspondente ao webhook |
| PAYMENTS_SIMULATION / ABACATEPAY_DEV_MODE | Opcionais | Os dois modos devem estar desligados em produção | `false` / `false` |
| DEFAULT_PLATFORM_FEE_PCT | Opcional | Fração padrão da taxa | `0.12` |
| EXPIRES_IN / REFRESH_TOKEN_TTL_DAYS | Opcionais | Duração do JWT e do refresh token | `1d` / `60` |
| SALT_ROUNDS | Opcional | Custo bcrypt para cadastro | Padrão do código `8` |
| ADMIN_INVITATION_TTL_HOURS / ADMIN_INVITATION_URL | Para convites | Validade e URL da interface de ativação | `24` e URL HTTPS do backoffice. Alias da URL: `BACKOFFICE_INVITATION_URL` |
| RESEND_API_KEY / MAIL_FROM | Para e-mail | Chave da API do Resend (segredo) e remetente num domínio verificado no Resend | `re_...` e `Proxi <nao-responda@seu-dominio>` |
| MAIL_REPLY_TO | Opcional | Endereço que recebe respostas aos e-mails | Caixa de suporte |
| SMTP_URL | Opcional | Alternativa ao Resend para testes locais; ignorado quando RESEND_API_KEY existe | `smtp://localhost:1025` |
| PASSWORD_RESET_FRONTEND_URL | Para recuperação | Destino HTTPS do link de redefinição | `https://app.example.invalid/authenticate/reset-password` |
| FRONTEND_URL / NOTIFICATION_FRONTEND_URL | Para notificações com links | Base dos avisos do pedido / base HTTPS das notificações transacionais | Origem pública da plataforma. Para FRONTEND_URL há fallback na primeira origem pública |
| FCM_SERVICE_ACCOUNT | Para push, segredo | Conta de serviço Firebase | JSON ou base64 fornecido pelo Firebase |
| CLOUDFLARE_IMAGES_API_TOKEN / CDN_API_TOKEN | Para upload, segredo | Token privado do Cloudflare Images e alias aceito | Token com permissão de edição |
| CLOUDFLARE_IMAGES_ACCOUNT_ID / CLOUDFLARE_IMAGES_ACCOUNT_HASH / CLOUDFLARE_IMAGES_VARIANT | Para imagens próprias | Conta, identificador de entrega e variante | Identificadores da sua conta e `public` |
| FAVORITES_MVP | Opcional | Ativa favoritos | `true`. Alias legado: `favorites_mvp` |
| ORDER_EXPIRATION_ENABLED / ORDER_EXPIRATION_INTERVAL_SECONDS | Opcionais | Worker de expiração e período da varredura | `true` / `300` |
| ORDER_APPROVAL_TIMEOUT_HOURS / ORDER_PAYMENT_TIMEOUT_HOURS | Opcionais | Prazos de aprovação e pagamento | `12` / `2` |
| OTEL_SDK_DISABLED / OTEL_EXPORTER_OTLP_ENDPOINT | Opcionais | A imagem inicia com tracing desativado. Para integrar um coletor, habilite o SDK e configure o endpoint OTLP **gRPC** acessível pela API | `true` por padrão na imagem. No Compose local o coletor usa porta 4317 |
| ALLOW_DEMO_SEED / PROXI_TEST_DATABASE_URL / PAYMENT_TEST_DATABASE_URL | Somente desenvolvimento/teste | Opt-in de demonstração / URL do banco isolado de integração | Omitir no Railway |
| PAGARME_CAPABILITY_SANDBOX, PAGARME_BASE_URL, PAGARME_SECRET_KEY, PAGARME_CAPABILITY_RECIPIENT_ID, PAGARME_CAPABILITY_RECIPIENT_PAYLOAD, PAGARME_CAPABILITY_BANK_PAYLOAD, PAGARME_CAPABILITY_IDEMPOTENCY_KEY | Somente ensaios legados de sandbox | Verificação de capacidades do antigo gateway | Omitir no Railway |

Selecione a referência pelo nome exato do serviço PostgreSQL em **Variables → Add Reference**. Confirme no painel que a variável escolhida aponta para o host privado. Mantenha JWT, banco, gateway, SMTP, FCM e token de imagens exclusivamente na API. [Variáveis de referência](https://docs.railway.com/variables) · [Conexão privada](https://docs.railway.com/pricing/cost-control)

## Validar localmente

Use Node 22 conforme `.nvmrc`, npm e Docker com daemon ativo. Execute na raiz:

```sh
npm ci --workspace apps/backend
npm exec --workspace apps/backend -- prisma generate
npm exec --workspace apps/backend -- tsc --noEmit -p tsconfig.build.json
npm run lint --workspace apps/backend
npm run build --workspace apps/backend
test -s apps/backend/dist/apps/backend/src/main.js
docker build -t taskgo-api:local .
bash scripts/ci/smoke-backend-image.sh taskgo-api:local
```

O ensaio cria uma rede Docker privada e um PostgreSQL 17 volátil. Aplica as migrations duas vezes para verificar uma nova release sem SQL pendente, verifica o usuário não-root, bcrypt, a guarda administrativa e a porta 8197, interrompe o banco e confere o encerramento do processo. O script remove os recursos do ensaio ao sair. A suíte Jest usa `npm run test:ci --workspace apps/backend`. Para incluir concorrência e refresh tokens, use um PostgreSQL local descartável chamado `taskgo_abacatepay_verify`, configure `DATABASE_URL`, `PROXI_TEST_DATABASE_URL` e `PAYMENT_TEST_DATABASE_URL` para ele e aplique `npm run prisma:deploy --workspace apps/backend` antes dos testes.

## Primeiro deploy

1. No serviço da API já existente, confirme o repositório, a branch e os campos da tabela. Durante a preparação inicial, pause o autodeploy se um merge puder iniciar a publicação antes de as variáveis estarem prontas.
2. No PostgreSQL, confirme que o banco está vazio ou que o histórico de `_prisma_migrations` corresponde ao repositório. Para um banco com dados, confira o backup e revise o SQL pendente. O histórico inclui remoção de colunas e mudanças de enums.
3. Configure as variáveis e o pre-deploy. Proteja a `main` no GitHub com revisão e checks de CI, incluindo **Quality**, **Backend image** e os testes de autenticação. Ative **Wait for CI** no Railway. [Integração GitHub](https://docs.railway.com/deployments/github-autodeploys)
4. Após o merge e o CI verde, habilite o autodeploy. Se esse commit já estiver na branch antes de habilitá-lo, use **Deploy Latest Commit** uma vez. Acompanhe **Build Logs** e **Deploy Logs**. O pre-deploy executa `prisma migrate deploy` uma vez por publicação na rede privada. Falha nessa etapa interrompe a publicação. O comando de start inicia somente a API. [Pre-deploy](https://docs.railway.com/deployments/pre-deploy-command)
5. Em **Settings → Networking → Public Networking**, selecione **Generate Domain** no serviço da API e use a porta detectada da aplicação. Copie o endereço HTTPS gerado. Execute os comandos abaixo, substituindo o endereço pelo recebido.

   ```sh
   API_URL=https://seu-servico.up.railway.app
   curl -fsS "$API_URL/health"
   curl -s -o /dev/null -w '%{http_code}\n' "$API_URL/admin/auth/me"
   ```

   O primeiro deve responder HTTP 200 com `{"status":"ok"}` após uma consulta `SELECT 1`. O segundo deve responder 401 sem credencial. A rota `/` permite distinguir um processo HTTP acessível de uma API com banco pronto. O cadastro inicial de operadores e os dados de catálogo precisam de um fluxo autorizado próprio. A publicação não executa seed.

## Operação e recuperação

- **Novas versões.** Revise a PR, mantenha migrations compatíveis com a versão anterior durante a troca e confira o commit nos logs. A aplicação recebe SIGTERM para drenar requisições, fechar o Prisma e encerrar o tracing. O banco fica em seu próprio serviço e volume.
- **Diagnóstico.** Se o build falhar, confira a raiz, o lockfile e a geração do Prisma. Se o pre-deploy registrar erro de conexão, verifique a referência privada, a disponibilidade do PostgreSQL e se os dois serviços pertencem ao mesmo ambiente. Se o start falhar, procure o nome da variável ausente. HTTP 503 em `/health` indica falha de acesso ao banco. Comandos e capturas de suporte devem ocultar segredos.
- **Migration com erro.** Consulte o SQL indicado e, no shell do serviço com as variáveis da API, rode `./node_modules/.bin/prisma migrate status` em `/app/apps/backend`. Compare o estado real do schema e o histórico antes de preparar a correção. Valide-a numa cópia isolada. Para tabelas preexistentes sem histórico, faça o baseline adequado antes da publicação.
- **Rollback.** Em **Deployments**, escolha a última versão saudável e use **Rollback** após conferir compatibilidade com o schema atual. O banco conserva as migrations aplicadas. Se o código antigo for incompatível, publique uma correção progressiva ou coordene recuperação do banco com janela e ponto de restauração definidos.
- **Backup.** Configure a frequência de snapshots em **PostgreSQL → Backups** e registre o último backup recuperável. Para ensaiar sem interromper produção, gere um dump lógico PostgreSQL com `pg_dump -Fc` em ambiente autorizado, restaure com `pg_restore --exit-on-error --no-owner` em **outro banco vazio**, compare contagens e `_prisma_migrations` e aponte uma API isolada para ele. Proteja o dump como dado de produção. Uma restauração de snapshot pelo painel troca o volume do serviço ao confirmar as mudanças. [Backups Railway](https://docs.railway.com/volumes/backups)
- **Consumo e gastos.** Acompanhe memória, CPU e reinícios nas métricas da API e uso do disco no PostgreSQL. Em **Workspace → Usage → Set Usage Limits**, configure um alerta de e-mail para Compute com um valor escolhido pelo responsável. Um limite rígido de Compute pode desligar os serviços. [Controle de custos](https://docs.railway.com/pricing/cost-control)
