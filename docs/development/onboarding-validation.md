# Validação do onboarding

Data: 12/09/2026. Ambiente: macOS, worktree isolado `task-04`, criado sem `node_modules` e sem copiar configurações privadas do checkout original. Foram incorporados os documentos e exemplos das tasks 1–3.

## Evidências

| Verificação                                                                                                        | Resultado observado                                                     |
| ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| `node --version` / `npm --version`                                                                                 | Node 22.23.2 / npm 10.9.8                                               |
| `docker --version` / `docker compose version`                                                                      | Docker 29.5.2 / Compose 5.1.3                                           |
| `docker compose config --quiet`                                                                                    | Exit 0; configuração reconhecida                                        |
| `docker info --format '{{.ServerVersion}}'`                                                                        | Exit 0 com acesso autorizado ao daemon; 29.5.2                          |
| `npm ci --ignore-scripts --fetch-retries=0 --fetch-timeout=15000 --cache /private/tmp/taskgo-onboarding-npm-cache` | Exit 0; 2411 pacotes instalados, 2416 auditados                         |
| `npm ci --fetch-retries=0 --fetch-timeout=15000 --cache /private/tmp/taskgo-onboarding-npm-cache`                  | Exit 0; instalação refeita com scripts normais, 2411 pacotes instalados |

`npm exec --workspace=apps/backend -- prisma generate` também concluiu com exit 0: `Generated Prisma Client (v5.22.0)`. Esse comando não aplica migrations nem comprova conectividade com o banco.

A tentativa offline com cache vazio falhou com `ENOTCACHED`; a primeira tentativa com rede restrita terminou com `Exit handler never called!`. A execução com acesso de rede autorizado concluiu. O npm reportou 191 vulnerabilidades (6 baixas, 89 moderadas, 91 altas e 5 críticas) e dependências descontinuadas. Não foi executado `npm audit fix`; a triagem precisa de uma tarefa própria.

## Migrations e inicialização em ambiente isolado

Foi criado um container descartável `taskgo-onboarding-validation`, imagem `postgres:17`, publicado somente em `127.0.0.1:55434`. O banco `taskgo` e as credenciais locais foram criados exclusivamente para esta execução; nenhum banco de desenvolvimento existente foi acessado. O exemplo da API foi copiado para `.env` local, ajustando somente conexão e porta 5300.

- `npm run prisma:deploy --workspace=apps/backend`: exit 0, **21 migrations aplicadas**, saída `All migrations have been successfully applied.`
- `npm exec --workspace=apps/backend -- nest start --watch`: compilação com `Found 0 errors`, seguida de `Nest application successfully started`.
- `npm exec --workspace=apps/frontend -- ng serve --port 5420`: compilação concluída e servidor disponível.
- `npm exec --workspace=apps/backoffice -- ng serve --port 5430`: compilação concluída e servidor disponível.
- `npm exec --workspace=apps/landing-page -- vite --host 127.0.0.1 --port 5517`: Vite disponível.

As URLs de API nos arquivos de ambiente de desenvolvimento das duas interfaces foram temporariamente direcionadas para `localhost:5300`. As portas alternativas evitaram conflitos com serviços existentes. Uma consulta com `urllib.request.urlopen`, timeout de 30 segundos, verificou status e conteúdo de cada endereço:

| Serviço      | GET                      | Resultado                        |
| ------------ | ------------------------ | -------------------------------- |
| API          | `http://localhost:5300/` | HTTP 200; `Hello World!`         |
| Frontend     | `http://localhost:5420/` | HTTP 200; HTML, 14862 caracteres |
| Backoffice   | `http://localhost:5430/` | HTTP 200; HTML, 528 caracteres   |
| Landing page | `http://localhost:5517/` | HTTP 200; HTML, 8046 caracteres  |

Após a verificação, os quatro processos foram encerrados, o container descartável e seu volume foram removidos, o `.env` temporário foi apagado e as alterações de portas nos arquivos de ambiente foram revertidas.

## Limites observados

A instalação, geração do Prisma Client, migrations em banco novo, inicialização dos quatro serviços e respostas HTTP básicas foram verificadas. Isso não comprova navegação interativa no navegador, autenticação, uploads, pagamentos ou integrações externas. Não foi provisionada conta administrativa.

O frontend emitiu `NG0408` porque há provedores de detecção de mudanças com Zone e sem Zone simultaneamente. A API registrou falha de exportação OTEL (`ECONNREFUSED 127.0.0.1:4317`), pois o collector não foi iniciado nesta verificação mínima; a rota pública respondeu normalmente. Essas observações devem ser consideradas ao validar funcionalidades e observabilidade.

Lint, testes e build de produção pertencem à rodada de qualidade e precisam de evidência própria; o smoke HTTP não equivale a aprovação de toda a aplicação.
