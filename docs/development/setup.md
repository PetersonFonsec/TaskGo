# Instalação e execução local

Execute os comandos na raiz do checkout, salvo indicação contrária. Use as versões do [README](../../README.md).

## Dependências

```sh
nvm install
nvm use
npm ci
```

O `package-lock.json` da raiz é a referência do monorepo. Não rode instalações independentes nos aplicativos. Se `npm ci` indicar divergência entre manifests e lockfile, interrompa o onboarding e corrija o lockfile em uma alteração revisada; não use `--force` como solução.

## Configuração local

```sh
cp config/db.env.example config/db.env
cp apps/backend/.env.example apps/backend/.env
```

Os comandos substituem arquivos existentes: use-os no primeiro setup, preservando configurações locais que já existam. Os arquivos `config/*.env` existentes já são versionados; `.gitignore` não protege arquivos já rastreados. `config/db.env` já é versionado neste repositório; não inclua suas alterações locais desse arquivo em commits. `apps/backend/.env` é ignorado pelo Git.

Troque o `JWT_SECRET` do arquivo local por um valor gerado com `openssl rand -hex 32`. O exemplo configura PostgreSQL local e pagamentos simulados. Credenciais CDN e Pagar.me são opcionais para funcionalidades que não usam essas integrações; uploads e pagamentos reais precisam de configuração própria. Não use credenciais de produção.

O frontend usa `apps/frontend/src/environments/environment.development.ts`. O backoffice usa `apps/backoffice/src/environments/environment.development.ts`; configurações públicas de navegador não devem conter segredos. API local: porta 3000; backoffice: 4300. A API permite essas origens no exemplo.

## Banco e migrations

```sh
docker compose up -d postgres_db
docker compose exec postgres_db pg_isready -U admin -d taskgo
npm exec --workspace=apps/backend -- prisma generate
npm run prisma:deploy --workspace=apps/backend
```

O Compose mantém os dados em um volume. Se o volume já foi inicializado com outra senha, editar o arquivo de ambiente não altera a senha existente: ajuste a conexão ou use um ambiente de banco separado. Não remova volumes para resolver esse problema sem avaliar os dados.

`prisma:deploy` aplica migrations existentes. Para criar uma migration após alterar o schema, use `npm run prisma:migrate --workspace=apps/backend -- --name nome_da_alteracao` e revise o SQL gerado. Seeds são opcionais; revise `apps/backend/src/prisma/seeds` antes de executá-los.

## Aplicações

Abra um terminal por aplicação, na raiz:

| Aplicação    | Comando                                                   | Endereço padrão       |
| ------------ | --------------------------------------------------------- | --------------------- |
| API          | `npm exec --workspace=apps/backend -- nest start --watch` | http://localhost:3000 |
| Frontend     | `npm run frontend`                                        | http://localhost:4200 |
| Backoffice   | `npm run backoffice`                                      | http://localhost:4300 |
| Landing page | `npm run landing-page`                                    | http://localhost:5173 |

O comando direto da API inicia o Nest sem depender de hooks npm de preparação do banco. O README anterior sugeria `docker compose up backend` e pgAdmin, mas esses serviços não estão ativos no Compose atual. Rode a API no host.

Confira o terminal de cada serviço, abra as páginas e execute `curl --fail http://localhost:3000/` para verificar a resposta HTTP da API. O acesso ao backoffice exige uma conta administrativa; subir o ambiente não provisiona essa conta automaticamente. Para encerrar, use Ctrl+C nos terminais e `docker compose stop postgres_db`.

## Verificações

```sh
npm run lint
npm run test:ci --workspace=apps/frontend
npm run backoffice:test
npm exec -- nx run shared:typecheck
npm exec -- nx run shared:test
npm run build
```

Para o backend, configure um PostgreSQL exclusivo de testes e execute `npm run test:ci --workspace=apps/backend`; o CI prepara esse banco automaticamente. `npm test` na raiz inclui o modo watch do frontend e não é o comando de uma rodada finita.

Os comandos agregados executam somente os targets existentes no Nx; consulte os `project.json` para a cobertura de cada aplicativo. Antes de executar testes de integração, configure um banco exclusivo de testes: scripts e2e do backend podem resetar esse banco.

A evidência disponível e os passos ainda pendentes estão no [registro de onboarding](onboarding-validation.md).
