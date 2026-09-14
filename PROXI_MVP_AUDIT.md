# Proxi MVP Audit

Data: 13/09/2026. Repositório analisado: TaskGo. Commit de referência: `33d8c7573dbac43358b7044c21db2562dc08e033`.

Escopo: auditoria funcional, arquitetural, de segurança e de prontidão para MVP. Somente este relatório foi criado; não houve implementação, refatoração, alteração de configuração, migration, seed, deploy ou cobrança. O estado inicial do Git estava limpo.

**Como ler:** “fato” significa comportamento identificado nos arquivos; “reproduzido” identifica execução isolada nesta auditoria; “risco” é uma consequência possível fundamentada no código; “recomendação” é trabalho proposto. Ausência significa que não foi encontrada implementação no repositório examinado, não que serviços externos certamente não existam. Links de evidência apontam para arquivos e linhas do checkout analisado.

## 1. Executive Summary

**Não está pronto para soft launch. Classificação: ALPHA interna, sem dinheiro real nem dados pessoais reais. Nota geral: 2/10.**

Há uma base substancial: frontend e backoffice Angular, API NestJS organizada por features com CQRS em vários domínios, persistência Prisma/PostgreSQL, busca por categoria, mapa Leaflet, geração de horários, pedidos, finalização, confirmação, avaliações e aprovação administrativa. Isso vai além de um catálogo estático, mas **o ciclo completo de contratação não funciona de forma autônoma e segura**.

Os cinco maiores bloqueadores, agrupados por impacto, são:

1. **Segurança e isolamento de contas:** consultas públicas retornam usuários completos, incluindo `passwordHash`; rotas autenticadas permitem alterar senha/dados de outro usuário e operar pedidos usando IDs externos à sessão.
2. **Integridade financeira:** webhook sem validação de origem, criação sem idempotência no gateway, resposta financeira ignorada, PIX pendente tratado como agendado e valor final diferente do valor capturado.
3. **Contratos da jornada quebrados:** cadastro envia `{ user: ... }` para DTO plano; endereço do perfil não atende ao DTO do pedido; iniciar/deslocar envia `status`, rejeitado pelo DTO. Os três problemas de contrato foram reproduzidos com o `ValidationPipe` real.
4. **Entrada de prestadores inviável como produto:** subcategorias são tratadas como IDs de serviços existentes; o cadastro pode transferir a titularidade desses serviços. CRUD de serviços é majoritariamente placeholder; não há configuração operacional de disponibilidade, área e recipient ponta a ponta.
5. **Reserva e operação não confiáveis:** ausência de exclusão concorrente de horários e conflitos entre serviços do mesmo prestador; bloqueio administrativo não impede descoberta/contratação; cancelamento não coordena o pagamento.

A próxima task deve ser **TASK-001: eliminar retornos públicos de usuários completos**, antes de qualquer exposição do ambiente. Em seguida, fechar autorização por objeto e contratos da jornada. Corrigir apenas o cadastro tornaria acessível uma plataforma com vulnerabilidades graves.

**Evidência dinâmica limitada:** 8 suítes/43 testes isolados passaram; checagem TypeScript de backend, frontend e backoffice passou. Esses resultados não certificam integração real, templates Angular, build de produção, banco, gateway ou jornada no navegador. Testes existentes simulam várias fronteiras e alguns preparam estados diretamente no banco.

## 2. Architecture Observed

### Organização real

A premissa “não é monorepo” diverge do checkout: [package.json raiz][root] declara `taskgo-monorepo`, npm workspaces para quatro apps e `libs/*`; [README][readme] e `nx.json` confirmam Nx. As aplicações são separadas por diretório e podem ter artefatos próprios, mas **este repositório é um monorepo**. Não há justificativa para separá-lo durante o fechamento do MVP.

| Camada | Implementação observada | Limitações relevantes |
|---|---|---|
| API | [NestJS 11, Prisma 5, CQRS, class-validator, JWT, bcrypt][bpkg] | CQRS aplicado em auth, provider, services, order, payments; outros módulos usam services convencionais. |
| Frontend | [Angular 21, TypeScript, RxJS, signals, componentes standalone, SSR/hidratação][fpkg] | Muitos contratos `any`, estado de sessão em localStorage e divergências de payload. |
| Backoffice | [Angular 21, aplicação própria][apkg] | Operação concentrada em prestadores, operadores e auditoria. |
| Landing page | [Vite, HTML/CSS/JavaScript][landing] | Branding TaskGo; links de lojas/termos/privacidade ainda placeholders. |
| Banco | [PostgreSQL, IDs BigInt, dinheiro Decimal, lat/lng Float e áreas JSON][schema] | Sem PostGIS; integridade adicional em SQL não aparece integralmente no Prisma. |
| Mapas | [ProxiMapComponent: importação dinâmica de Leaflet, tiles OpenStreetMap][map] | Mapa exibe dados recebidos; não constitui motor geográfico de busca. |
| Pagamentos | [PagarmeService: chamadas HTTP Core v5 e simulação][gateway] | Não foi demonstrada operação real na conta do gateway. |
| Observabilidade | [OpenTelemetry no backend][tracing], frontend, Prometheus, Grafana e Jaeger | Métricas específicas de backoffice; pouca evidência de supervisão financeira. |

### Padrões e qualidade estrutural

[AppModule][appmodule] registra autenticação e roles globalmente, interceptor de BigInt e telemetria administrativa. [main.ts][main] configura Helmet, CORS, `ValidationPipe` com `whitelist`, `forbidNonWhitelisted` e `transform`, filtro de exceções e Swagger. As proteções existem, mas a ausência de `@Roles` em vários controllers deixa qualquer usuário autenticado passar; o guard não implementa autorização por objeto.

Há Commands/Queries pequenos, DTOs, mappers e transações. Entretanto, handlers de serviços retornam textos de scaffolding, controllers legados recebem IDs de atores e o [AdminProvidersService][adminproviders] concentra consultas, métricas, apresentação e transições em um arquivo grande. Melhorias arquiteturais devem seguir as correções de negócio, sem impor CQRS aos módulos que não precisam.

[BigIntInterceptor][bigint] converte IDs, datas e Decimal para JSON; **não remove campos sensíveis**. O mapper de perfil remove hash no login/perfil, mas não é usado nas queries públicas de prestadores e várias listagens de pedidos/usuários.

### Configuração e infraestrutura

- Configuração central em [ConfigModule][config], com validação de banco, JWT, origens em produção e credenciais Pagar.me quando a simulação está desativada. Isso é uma proteção positiva. A validação exige presença de JWT, não uma política de força/entropia.
- Os dois [environments do frontend][fenv] apontam para `http://localhost:3000`, com `production: false`; o exporter aponta para localhost. Não há configuração de destino publicável pronta nesses arquivos.
- [docker-compose.yml][compose] sobe PostgreSQL 17 e observabilidade. Backend e backoffice estão comentados. [Dockerfile backend][bdocker] inicia `start:dev`, instala com `npm install` e foi desenhado para contexto isolado, embora existam imports compartilhados. O comentário sobre `prestart:dev` não corresponde a um script no package.json atual. [Dockerfile frontend][fdocker] usa Node 20 e contexto local; a referência de desenvolvimento é Node 22. Compatibilidade dos builds Docker não foi executada.
- Backoffice possui Nginx, runtime config e healthcheck estático; isso não comprova saúde da API/banco.
- Há [procedimento de deploy][deploy] e rollback, mas o próprio documento deixa provedor, domínio, entrega, backup/restauração e responsável pendentes.
- Railway, Neon, Cloudflare R2, Firebase e Sentry **não foram identificados como integrações operacionais**. Há dependência `cloudflare` e variáveis CDN, mas isso não demonstra upload funcional. Não foi encontrada configuração Ionic/Capacitor nos apps examinados.
- Há arquivos de ambiente versionados com valores para JWT, banco e Grafana. Não foram publicados seus conteúdos nem verificadas credenciais contra serviços externos. Não se pode afirmar que são segredos de produção; reutilizá-los em produção seria inseguro.
- Não é necessário contratar toda a infraestrutura sugerida para validar o produto. Uma API, um PostgreSQL, hospedagem do frontend/backoffice, entrega transacional mínima e logs/alertas suficientes bastam como desenho inicial. A escolha comercial e os custos não foram auditados.

### Testes e alcance da exploração

Foram inventariados os diretórios de fontes, manifests, rotas, módulos, controllers, DTOs, handlers/queries, Prisma, migrations/seeds, configurações, Docker, CI e testes; os caminhos críticos foram rastreados entre frontend, API e persistência. O foco não foi auditar pixel a pixel cada componente visual.

[CI][ci] define instalação com lockfile, PostgreSQL isolado, Prisma, lint, contratos compartilhados, testes e builds. Existem Jest, Karma/Jasmine, Cypress e testes E2E da API. O nome de um teste não garante a cobertura: [customer-journey.cy.ts][cypress] intercepta respostas HTTP; [order-lifecycle.e2e-spec.ts][lifecycle] usa gateway mockado e prepara estados diretamente com Prisma; [user-register.spec.ts][registerspec] espera o envelope incompatível com a API.

Nenhum banco de desenvolvimento/produção foi modificado. Os scripts E2E do backend têm `pretest:e2e`/`posttest:e2e` com `prisma migrate reset --force`; por isso não foram executados. Também não houve build com geração de artefatos, teste visual em navegador, carga real, auditoria completa de dependências/CVEs, scan do histórico Git ou homologação financeira.

## 3. Functional Coverage

Status refere-se à área completa, não à mera existência da tela. As evidências abaixo distinguem partes implementadas de lacunas.

| Área | Status | Evidências | Problemas |
|------|--------|------------|-----------|
| Auth | IMPLEMENTADO COM PROBLEMAS | [AuthController][authcontroller], [login][login], [UserRegister][registerhttp] | Login verifica bcrypt; cadastro UI/API incompatível; recuperação incompleta; sem limitação de tentativas encontrada. |
| Clientes | IMPLEMENTADO COM PROBLEMAS | [UserController][usercontroller], [UserService][userservice], [AddressService][addresses] | CRUD de endereços tem ownership; CRUD de usuário não. Perfil/sessão e endereço de contratação divergem. |
| Prestadores | IMPLEMENTADO COM PROBLEMAS | [UserServiceValidator][servicevalidator], [AdminProvidersService][adminproviders] | Confusão subcategoria/serviço, reassociação de ofertas alheias e bloqueio não aplicado à contratação. |
| Serviços | PARCIAL | [ServicesController][servicescontroller], [CreateServiceHandler][createservice] | Listagem existe; criar, editar, remover e buscar item têm placeholders. Não há gestão completa de preços/horários. |
| Categorias | IMPLEMENTADO COM PROBLEMAS | [CategoriesController][categoriescontroller], [CategoriesService][categories] | Escrita sem papel administrativo; create não retorna/aguarda transação; ativos/ordenação não aplicados por padrão. |
| Busca | PARCIAL | [Search][search], [GetProvidersByCategoryHandler][bycategory] | Categoria e filtros locais; sem motor backend por localização, ranking de distância, disponibilidade ou paginação nessa query. |
| Geolocalização | PARCIAL | [schema][schema], [Search.providerDistance][search], [mapa][map] | Haversine no browser; histórico completo exposto e primeira localização sem ordenação; áreas ignoradas. |
| Agenda | IMPLEMENTADO COM PROBLEMAS | [ProviderService.getAvailability][availability], [CreateOrderHandler][createorder] | Checa slot somente antes da gravação; não garante exclusão concorrente nem entre serviços; permite passado; sem gestão da agenda. |
| Pedidos | IMPLEMENTADO COM PROBLEMAS | [OrderController][orderscontroller], [Order HTTP][orderhttp] | Ownership incompleto, preço manipulável, transições da UI rejeitadas, exclusão destrutiva disponível. |
| Pagamentos | IMPLEMENTADO COM PROBLEMAS | [CreateOrderPaymentHandler][createpayment], [PagarmeService][gateway], [webhook][webhook] | Inseguro para dinheiro real; recipient onboarding ausente; estado, idempotência e reconciliação deficientes. |
| Conclusão | PARCIAL | [FinishOrderHandler][finish], [ConfirmOrderCompletionHandler][confirm] | Finalização e confirmação existem com checagens de dono; são inalcançáveis pela jornada normal de início e não conciliam valor final/captura. |
| Avaliações | IMPLEMENTADO COM PROBLEMAS | [CreateOrderReviewHandler][review] | Nota 1–5, dono, conclusão, unicidade e tags implementados; brechas adjacentes permitem alterar dono/excluir pedido e invalidam a confiança global. |
| Reputação | PARCIAL | [review][review], [perfil público][providerget] | Média/contagem recalculadas; sem distribuição, ordenação/paginação de recentes e tags completas na leitura pública. Exclusão não recalcula média. |
| Dashboard prestador | IMPLEMENTADO COM PROBLEMAS | [ProviderHomeService][dashboard], [ProviderHomePage][dashboardui] | Consulta real só no login; fallback demonstrativo; solicitações/indicadores envelhecem; “recebido” não equivale a repasse bancário. |
| Backoffice | PARCIAL | [rotas][adminroutes], [guards][adminguard], [transições][adminproviders] | Prestadores/operadores/auditoria reais; sem operação geral de clientes, pedidos, pagamentos, disputas e moderação. |
| Notificações | NÃO IMPLEMENTADO | [UserVerificationService][verification], [AdminInvitationDeliveryService][invitation], TODOs em confirmação/review | Código de verificação só em memória, convite só em log, sem entrega de eventos do atendimento. Toast não é notificação transacional. |
| Upload de evidências | PARCIAL | [FinishServicePage][finishui], [FinishOrderDto][finishdto] | Base64 dentro do JSON e banco, sem upload/storage/validação real de arquivo ponta a ponta. |
| Infraestrutura publicada | NÃO FOI POSSÍVEL DETERMINAR | [deploy][deploy] | Não há prova de ambiente ativo, backup restaurável, TLS e gateway homologado. |
| Premium e patrocinados | NÃO IMPLEMENTADO | [schema][schema], [Search][search] | Flags visuais toleradas pelo frontend; sem assinatura, entitlement, campanha ou cobrança correspondente. |

## 4. Main User Journey

### Fluxo esperado

Cadastro → endereço → descoberta local → comparação e serviço → horário → solicitação → aceite → garantia/pagamento → agendado → deslocamento → início → finalização com valor → confirmação do cliente → captura/liberação coerente → avaliação/reputação.

### Fluxo real rastreado

| Etapa | Frontend → API → banco/integrador | Resultado observado |
|---|---|---|
| 1. Criar conta | `RegisterUser.register` → `UserRegister.registerUser` → `POST /auth/register` → `AuthRegisterDTO` | Envia `{user: payload}`; DTO espera campos na raiz. Validação retorna 400 antes do handler. |
| 2. Cadastrar prestador | UI seleciona `Subcategory` → envia IDs → `UserServiceValidator` consulta `Service` e faz `connect` | Sem correspondência retorna erro; se IDs coincidem, vincula serviço existente ao novo prestador. Não cria oferta própria. |
| 3. Localização | Cadastro/endereço → Prisma `Address`; busca usa sessão ou browser | Endereço após login não vem na consulta do login; busca pode usar GPS em vez de endereço. Não há sincronização operacional de `ProviderLocation` encontrada. |
| 4. Buscar | `GET /provider/by-category/:slug` → Prisma include de usuário/localizações/serviços → filtros de `Search` | Não verifica status aprovado, distância/área no backend nem ordena histórico. Sem categoria, o frontend ainda monta rota por slug. |
| 5. Escolher serviço | `/customer/:userId` → `SingleUser.selectedService` | Sempre `services[0]`; serviço da categoria pesquisada pode não ser o primeiro do perfil completo. Não há seletor efetivo para outras ofertas. |
| 6. Escolher horário | `GET /provider/:id/availability?from&to&serviceId` → JSON semanal e pedidos | Slots reais gerados, com limites descritos na seção de agenda. Sem availability válida, botão de contratação permanece indisponível. |
| 7. Solicitar | `SingleUser.register` → `POST /order` | Envia preço e clientId; endereço completo de sessão contém campos proibidos no snapshot. Com endereço presente há rejeição reproduzida; com sessão sem endereço pode criar pedido sem local. |
| 8. Prestador receber/aceitar | Home usa `providerHome` do login → `POST /order/:id/provider/:providerId/confirm` | Aceite grava `AGUARDANDO_PAGAMENTO`, mas actorId é o da URL. Solicitação nova não atualiza a lista pendente durante a sessão. |
| 9. Pagar | Checkout → `POST /orders/:id/payment` → recipient legado → Pagar.me → Payment | Sem recipient, erro. Com recipient, chama gateway, escolhe estado pelo método e marca `AGENDADO`, mesmo com PIX pendente. |
| 10. Deslocar/iniciar | UI → `PATCH /order/:id {status: ...}` | `UpdateOrderDto` não possui status. Retorna 400. Não foi encontrado endpoint alternativo de início/deslocamento. |
| 11. Finalizar | Tela finish → `PATCH /orders/:id/finish` → ordem/completion/photos/timeline | Funciona como operação isolada para estado EM_ANDAMENTO previamente existente; salva valor final e motivo, sem ajustar Payment. |
| 12. Confirmar | Tela confirm → `PATCH /orders/:id/confirm` → captura antes da transação → CONCLUIDO/PAGO | Dono é verificado; PIX precisa estar pago; cartão captura o valor antigo e não valida resultado de negócio do gateway. |
| 13. Avaliar | Tela review → tags → `POST /orders/:id/review` → avaliação e média | Bom núcleo isolado; fluxo normal não chega aqui sem superar bloqueios anteriores. |

**Resposta aos oito passos do pedido:** um usuário novo não consegue criar conta pela UI atual; mesmo usando uma conta preparada, encontrar prestador é parcial, contratar/agendar têm falhas de contrato, pagar depende de preparação externa e tem riscos críticos, iniciar não funciona, confirmar/avaliar só funcionam sobre estados previamente preparados. Portanto, não há jornada autônoma demonstrada.

### Agenda e transições

[ProviderService.getAvailability][availability] gera slots a partir de `Service.availability.weekdays`, com duração padrão de 60 minutos. O horário é convertido usando offset fixo de São Paulo; o `timezone` opcional do JSON não altera o cálculo. A opção 24h do perfil também não participa da geração.

Os conflitos são consultados por **serviceId**, com igualdade de horário inicial. Um prestador com dois serviços pode receber duas reservas simultâneas. Não há duração final persistida no pedido para testar sobreposição arbitrária. A consulta da disponibilidade ocorre antes da transação de criação; duas requisições simultâneas podem passar. Não há constraint de reserva correspondente nas migrations. Datas passadas não são eliminadas, `scheduledFor` é opcional e o endpoint público aceita intervalos extensos sem teto de dias.

`ScheduleOrderHandler` escreve diretamente `AGENDADO`, sem checar aprovação, pagamento, dono, passado ou slot. Aceite/cancelamento leem estado e atualizam por ID sem compare-and-set. `FinishOrderHandler` também valida antes da transação e atualiza somente por ID, permitindo finalizações concorrentes. Já confirmação do cliente usa `updateMany` condicionado ao estado, mas depois de chamar o gateway.

Rejeição pelo prestador grava `CANCELADO`, não `REJEITADO`, sem evento de rejeição e sem tratamento financeiro. A timeline tem enum amplo, mas solicitação/aceite/cancelamento/início não são registrados por esses handlers. O detalhe deriva eventos e até usa `new Date()` como data de estado antigo; quando aparece um evento real, o fallback inteiro deixa de ser usado. O histórico exibido não é auditoria confiável de todo o ciclo.

## 5. Critical Issues

P0 bloqueia lançamento. P1 é alta prioridade, incluindo requisitos operacionais do lançamento. P2 é importante. P3 é melhoria. Achados de segurança e pagamento abaixo complementam esta lista, sem somar ocorrências repetidas como problemas diferentes.

| ID / prioridade | Descrição e impacto | Evidência | Sugestão de solução |
|---|---|---|---|
| C01 — P0 | Cadastro UI/API incompatível: impede aquisição de clientes e prestadores. | [UserRegister.registerUser][registerhttp], [AuthRegisterDTO][registerdto]; 400 reproduzido. | Contrato único, body plano ou envelope consistente; teste HTTP usando payload real da UI. |
| C02 — P0 | Deslocamento/início impossíveis pela UI: serviço nunca chega naturalmente a EM_ANDAMENTO. | [Order.updateOrderStatus][orderhttp], [UpdateOrderDto][updatedto], [OrderDetailsPage][detailsui]. | Endpoints explícitos com estado anterior e identidade verificados; conectar botões a eles. Não liberar atualização arbitrária de status. |
| C03 — P0 | Cadastro de prestador confunde subcategorias com ofertas e reassocia serviços de terceiros; pedidos históricos passam a apontar indiretamente ao novo prestador. | [seleção de subcategorias][registerservices], [UserServiceValidator][servicevalidator], `Service.providerId` no [schema][schema]. | Tratar subcategoria como classificação; criar serviço do proprietário; impedir mudança de dono de oferta já contratada. |
| C04 — P0 | Reserva não garante exclusividade; dupla reserva e agenda entre serviços do mesmo prestador. | [availability][availability], [CreateOrderHandler.ensureSlotAvailable][createorder], [ScheduleOrderHandler][schedule]. | Validação por prestador/intervalo dentro de exclusão transacional; guardar duração/snapshot, recusar passado e limitar horizonte. |
| C05 — P0 | Contratação com endereço da sessão é rejeitada; sem endereço cria pedido sem destino. | [SingleUser.register][bookingui], [CreateOrderDto][createdto], [mapper de perfil][profilemapper]. | Selecionar endereço válido e enviar apenas snapshot permitido; backend exigir local para serviço domiciliar. |
| C06 — P0 | Serviço/agenda/recipient não podem ser configurados ponta a ponta por prestador novo. | [CreateServiceHandler][createservice], [UpdateServiceHandler][updateservice], [createpayment][createpayment]. | CRUD mínimo de oferta/disponibilidade/área; caminho controlado e auditável de habilitação de recebedor. |
| C07 — P0 | Bloquear/rejeitar prestador no backoffice não impede sua descoberta ou contratação. | [AdminProvidersService.executeTransition][adminproviders] vs [by-category][bycategory], [GetProviderHandler][providerget] e [createorder][createorder]. | Aplicar APPROVED em busca/perfil/agendamento e política de acesso para bloqueados; definir destino de pedidos existentes. |
| C08 — P1 | Dashboard mostra dados antigos ou fictícios e pode ocultar solicitações novas. | [AuthController.login][authcontroller], [ProviderHomePage][dashboardui], [data.ts][dashboarddata]. | Endpoint de dashboard autenticado; atualizar ao abrir/retornar; remover fallback demonstrativo; erro/zero explícitos. |
| C09 — P1 | Operação não consegue resolver disputa/cancelamento/reembolso no produto. | [adminroutes][adminroutes], [detailsui][detailsui], [cancel handler][cancel]. | Fluxo mínimo de suporte com consulta e ação financeira auditada; não construir painel administrativo completo agora. |
| C10 — P1 | Artefato/configuração publicável não demonstrados; frontend aponta ao localhost. | [fenv][fenv], [compose][compose], [deploy][deploy]. | Homologação com URLs reais, simulação proibida no lançamento com cobrança, backup/restauração e healthcheck dependente de banco. |
| C11 — P2 | `CategoriesService.create` dispara transação sem `return/await`; resposta pode indicar sucesso antes de falha de persistência. | [CategoriesService.create][categories]. | Retornar/aguardar transação, resultado explícito e testes de falha. |

## 6. Security Findings

### S01 — P0: exposição pública de hash e dados pessoais

**Fato:** `GET /provider`, `GET /provider/:id` e `GET /provider/by-category/:slug` são públicos/opcionalmente autenticados e incluem `user: true`. O modelo User contém `passwordHash`, CPF, email e telefone. As duas últimas queries também incluem histórico de localizações e reviews completos. `BigIntInterceptor` mantém todas as chaves. Não existe omissão global de senha no [PrismaService][prisma].

**Impacto:** coleta em massa de dados pessoais, ataque offline a hashes e exposição da localização precisa do prestador. Não é necessária sessão para esses caminhos. `GET /user`, listagens por cliente/prestador e summary do pedido também retornam entidades completas, nesse caso após autenticação mas sem escopo adequado.

**Evidências:** [ListProvidersHandler][providerlist], [GetProviderHandler][providerget], [GetProvidersByCategoryHandler][bycategory], [ListProviderOrdersHandler][providerorders], [GetOrderSummaryHandler][summary], [UserService.findAll][userservice].

**Recomendação:** projeções `select` e DTOs específicos para descoberta, participante e conta própria; não devolver hash em nenhuma resposta. Separar região pública de localização privada. Testes recursivos de ausência de dados proibidos, com e sem autenticação. Se já houve exposição externa, avaliar o alcance real e resposta ao incidente; esta auditoria não demonstra que houve acesso por terceiros.

### S02 — P0: alteração de conta de terceiro

**Fato:** [UserController][usercontroller] usa `:id` sem compará-lo à sessão. [UserService.buildUserUpdateData][userservice] permite alterar `password`, email, telefone, CPF e tipo; `UpdateUserDto` herda os campos do cadastro. Qualquer conta autenticada pode tentar alterar senha de outro ID. Verificação de contato e exclusão também não recebem o dono autenticado.

**Impacto:** tomada de conta, alteração de identidade e dados, exclusão indevida. Trocar email/telefone diretamente também contorna a verificação e não limpa flags já verificadas. `UserType.ADMIN` não cria um AdminUser e **não implica acesso automático ao backoffice**; a falha comprovada é a edição de conta/tipo sem autorização.

**Recomendação:** operações de conta própria baseadas na sessão, campos de perfil restritos e troca de senha com confirmação apropriada; administração de terceiros somente no domínio admin auditado. Revogar sessões ao trocar credencial e proibir alteração livre de tipo/CPF.

### S03 — P0: IDOR e operações indevidas em pedidos

**Fato:** controller/queries de detalhe, resumo, listagem, alteração, exclusão e agendamento não recebem identidade para verificar participação. Aceite/cancelamento validam o providerId da **URL**, não o usuário autenticado. Create aceita `clientId` e `finalPrice` do body. Update permite trocar cliente, serviço, preço e horário.

**Impacto:** ler endereço e evidências de terceiros, forjar solicitação, aceitar/rejeitar em nome do prestador, mudar titularidade e valor, apagar rastros financeiros. O DELETE pode apagar em cascata Payment, avaliação, timeline e evidências, sem cancelar a cobrança externa. Reatribuir um pedido concluído compromete a regra de “cliente real” na avaliação.

**Evidências:** [OrderController][orderscontroller], [UpdateOrderHandler][updateorder], [RemoveOrderHandler][removeorder], [ScheduleOrderHandler][schedule], [ConfirmOrderByProviderHandler][accept].

**Recomendação:** ownership em toda leitura/escrita, identidade pela sessão e role coerente; tirar DELETE do fluxo normal, usar cancelamento auditável; preço e dono definidos pelo backend. As verificações corretas de finish/confirm/review e pagamento devem ser preservadas e estendidas aos demais caminhos.

### S04 — P0: webhook financeiro não autenticado

**Fato:** [PaymentsController.webhook][paymentcontroller] tem `@Public()` e entrega o body diretamente ao handler. Não há assinatura, credencial de webhook ou confirmação no gateway. Quem conhece um chargeId — devolvido pelo checkout e por outras leituras — pode enviar um novo eventId com `charge.paid`.

**Impacto:** marcar pagamento como pago sem transferência real, ou forjar falha/reembolso. **Recomendação:** autenticar a origem conforme a configuração Core v5 realmente contratada, validar recurso/conta/valor e rejeitar mensagens sem comprovação. Não assumir um algoritmo de assinatura de versões antigas; o mecanismo específico precisa ser homologado.

### S05 — P1: token anexado a chamadas para terceiros

**Fato:** [tokenInterceptor][tokeninterceptor] adiciona Authorization a qualquer HttpClient request. [Geolocalization][geo] chama BrasilAPI/AwesomeAPI pelo mesmo cliente.

**Impacto:** tenta enviar JWT Proxi a domínios de terceiros; envio efetivo depende de CORS/preflight. Também pode quebrar consultas CEP. **Recomendação:** permitir token apenas para a origem e prefixo da API; testes com URLs externas. Prioridade aumenta para P0 se confirmado vazamento em ambiente ativo.

### S06 — P1: separação de tokens incompleta no sentido admin → cliente

**Fato:** auth comum e admin usam `auth.jwtSecret`. Admin exige `tokenKind: admin` e versão; o guard comum apenas verifica assinatura e extrai `id ?? sub`, buscando esse número em User. Com IDs coincidentes, um token admin válido pode ser interpretado como usuário comum. Não há evidência de que token comum entre no admin: o admin tem validação dedicada.

**Impacto:** confusão de identidade entre tabelas e possível acesso indevido por operadores. **Recomendação:** validar finalidade/audience/issuer/tipo em ambos os domínios, manter checagem de usuário atual; testes bidirecionais. [AuthGuard][authguard], [AdminAuthTokenService][admintoken], [AuthModule][authmodule], [AdminAuthModule][adminauthmodule].

### S07 — P1: proteção antiabuso e contatos incompletos

Não foi encontrada limitação de tentativas nas rotas de login/cadastro/recuperação/verificação ou limites de uso para disponibilidade. [UserVerificationService][verification] usa `Math.random`, Map de processo, sem expiração/tentativas e sem envio. [ForgotPasswordHandler][forgot] publica evento com token de acesso normal; não foi encontrado consumidor que entregue reset nem endpoint completo de redefinição. A resposta de usuário inexistente permite enumeração.

**Recomendação:** rate limiting nas bordas críticas, códigos criptográficos com TTL/tentativas/persistência, token separado de reset e respostas não enumeráveis. Não apresentar verificação como entregue enquanto não houver transporte.

### S08 — P1: catálogo mutável por qualquer conta autenticada

[CategoriesController][categoriescontroller] não restringe escrita a admin. O [RolesGuard][rolesguard] permite rotas sem metadados de papéis. Criar/alterar/remover categorias afeta descoberta e a resolução de comissão por nome/slug. **Recomendação:** administração autenticada e auditada, com leitura pública apenas de categorias ativas.

### S09 — P1: seeds e valores de acesso versionados

`git ls-files` inclui `config/backend.env`, `config/db.env`, `config/grafana.env` e `apps/backend/.env.test`. Há valores de autenticação; o JWT do config/backend tem apenas seis caracteres. [seeds.ts][seeds] recria/reativa administrador com senha fixa e imprime o acesso, sem bloqueio por ambiente. Também apaga dados de usuários do domínio de seed.

**Impacto:** se usados fora do desenvolvimento, acesso previsível e perda de dados. **Recomendação:** separar catálogo mínimo de massa demo, impedir seed demo em produção, provisionar primeiro admin de forma segura, externalizar valores e rotacionar qualquer segredo que tenha sido reutilizado. Validade em produção e histórico de exposição não foram determinados.

### S10 — P1: cartão bruto; P2: evidências sem pipeline de upload

A UI envia número/CVV à API, que os transmite ao gateway. Não foram encontrados campos dedicados de cartão/CVV no banco, nem gravação explícita desses campos pelo handler. Entretanto, `rawProviderResponse` e payload de webhook são persistidos sem whitelist. Isso exige limitar o que se armazena, não afirmar que CVV já está persistido. Detalhes e recomendação de tokenização na seção 7.

[FinishServicePage][finishui] manda Data URLs base64 como `photos[].url`; [FinishOrderDto][finishdto] aceita qualquer string. O corpo HTTP não foi ajustado para fotos, então arquivos comuns podem ser rejeitados antes do handler; arquivos menores são guardados como texto no banco. Não há verificação backend de formato/tamanho real, limpeza de metadados ou storage operacional encontrado. Para MVP, tornar fotos opcionais/desabilitá-las até existir upload limitado e autorizado.

### Controles positivos e limites

Endereços em `/user/me/addresses` aplicam ownership e whitelist; favoritos usam identidade da sessão. Finalizar/confirmar/avaliar e iniciar/consultar pagamento têm checagens locais de participante. CORS de produção usa allowlist; Helmet e DTOs estão ativos. Admin possui autenticação própria, papéis/capabilities, invalidação por versão, consultas projetadas e auditoria transacional. Não foi identificado SQL dinâmico inseguro nas rotas examinadas; operações de negócio usam Prisma. Migrações com SQL estático não são evidência de SQL injection. Swagger e `/metrics` são públicos: restringir exposição operacional conforme ambiente, sem confundi-los com uma prova de vazamento de senha.

## 7. Payment Findings

### O que está implementado

[CreateOrderPaymentHandler][createpayment] busca pedido do cliente, aceita PIX/cartão, exige recipient do prestador, resolve comissão por serviço → categoria → configuração, calcula centavos/split, chama gateway e salva Payment com identificadores e QR. [PagarmeService][gateway] usa Basic Auth na API Core v5, `auth_only` para cartão e PIX com expiração; possui métodos capture/cancel/refund/getCharge. Os três últimos não formam um fluxo completo de operação só por existirem.

Há unicidade de Payment por pedido e de IDs de cobrança/pedido do gateway; [PaymentWebhookEvent][schema] deduplica eventId. [PaymentService.capturePayment][capture] exige estado autorizado ou previamente pago. A confirmação do cliente grava completion/timeline/pagamento em transação local. São fundamentos úteis, mas insuficientes para liberar dinheiro real.

| ID / prioridade | Fato, impacto e evidência | Recomendação |
|---|---|---|
| P01 — P0 | Webhook público altera Payment sem comprovação. [controller][paymentcontroller], [handler][webhook]. | Validar origem e identidade financeira antes de aplicar evento; teste de evento forjado. |
| P02 — P0 | POST de cobrança é feito antes do upsert, sem chave idempotente/lock. Duas chamadas concorrentes podem criar duas cobranças e a última sobrescrever IDs locais. Troca PIX→cartão permite nova cobrança sem cancelar anterior. [createpayment][createpayment], [gateway.request][gateway]. | Tentativa durável, chave estável por operação, exclusão de concorrência, recuperação de resposta perdida e regra explícita de troca de método. |
| P03 — P0 | `gateway.status` não governa persistência: cartão sempre vira AUTORIZADO, PIX PENDENTE. Capture ignora body de resposta; HTTP 2xx com `status: failed` vira sucesso local. Ambas as situações foram reproduzidas com doubles isolados. | Mapear e validar estado de negócio, IDs e valor; recusas/falhas não podem agendar/concluir. Homologar respostas reais. |
| P04 — P0 | Pedido vira AGENDADO ao gerar PIX, antes de pagar. Webhook só altera Payment, não Order. Falha/cancelamento/reembolso deixa pedido em estado anterior sem reação. | Tabela de transições coordenadas; só habilitar execução com garantia financeira válida; atualizar ambos e registrar evento. |
| P05 — P0 | Preço inicial vem do body. Finish altera Order.finalPrice, mas Payment.amount/split ficam iguais. Ex.: autoriza R$120, finaliza R$150, captura R$120 e conclui exibindo R$150. [createorder][createorder], [finish][finish], [confirm][confirm], [capture][capture]. | Preço inicial calculado no servidor e snapshot; MVP pode restringir preço fixo. Se variável, consentimento e ajuste financeiro coerente antes de concluir. |
| P06 — P0 | Captura externa ocorre antes da transação que confirma pedido. Concorrência pode disparar duas capturas; falha no banco após sucesso deixa pagamento externo capturado e pedido pendente. | Operação de captura identificada e recuperável, estado intermediário durável e reconciliação. Não manter transação do banco aberta durante rede. |
| P07 — P0 | `cancelByProvider` só cancela Order. Métodos cancel/refund do gateway não estão ligados ao pedido/admin. Exclusão apaga registros locais sem desfazer cobrança. | Cancelar/autorização ou reembolsar conforme estado, persistir resultado e permitir retry seguro/auditoria. |
| P08 — P1 | Evento antes do vínculo chargeId é salvo com paymentId nulo e tratado como processado; replay do mesmo ID é ignorado para sempre. Evento atrasado pode sobrescrever REEMBOLSADO com PAGO. | Inbox com status recebido/processado/pendente/erro, tentativa posterior, máquina de estados e consulta canônica quando necessário. |
| P09 — P1 | Reuso de PENDENTE ignora validade do QR; não há polling/refresh financeiro no checkout. PIX expirado pode ficar sem caminho de nova tentativa. [checkout][checkout], [createpayment.isReusable][createpayment]. | Verificar expiração, criar tentativa nova idempotente, permitir atualização de estado e preservar histórico anterior. |
| P10 — P0 | Não há onboarding/sincronização operacional de recipient encontrado. Checkout verifica apenas ID legado, ignora readiness do payout profile e status bloqueado. Seeds nem fornecem recipient. | Habilitar recebedor em fluxo seguro ou operação interna auditada; bloquear contratação paga sem readiness confirmada; homologar conta e split. |
| P11 — P1 | `fetch` não possui timeout explícito, retry controlado ou reconciliação de operação incerta; erro externo vira 502 genérico. | Timeout, categorização de falhas, observabilidade e retry apenas com idempotência; nunca repetir cegamente uma cobrança. |
| P12 — P1 | Dois vocabulários de status convivem. Reuso aceita apenas PENDENTE/AUTORIZADO/PAGO; CAPTURED/RELEASED não são reutilizados. | Normalizar enums/transições e migrar legado explicitamente, preservando histórico financeiro. |
| P13 — P1 | PAN/CVV trafegam pelo backend; respostas completas ficam persistidas. [checkout][checkout], [gateway][gateway], [schema][schema]. | Tokenizar diretamente no gateway, enviar token à API, excluir dados sensíveis dos logs/persistência e limitar raw payloads. |
| P14 — P1 | PIX pago recebe split desde criação e não há comando de liberação pós-confirmação. Mudar status local para PAGO não demonstra retenção/liberação real. | Definir com gateway o produto financeiro de repasse; homologar a política ou ajustar a promessa ao que de fato é oferecido. |
| P15 — P1 | Simulação pode ser explicitamente habilitada em produção; `capturePayment` também trata prefixo `ch_sim_` como sucesso mesmo fora dela. | Separar ambientes/dados e impedir cobranças simuladas em lançamento com dinheiro real. |

### Dinheiro, split e comissão

Os campos são Decimal no PostgreSQL, porém os handlers convertem para `Number`. O split usa centavos inteiros com arredondamento da comissão e residual do prestador, mantendo a soma dos dois valores dentro desse cálculo. Isso é melhor do que arredondar ambas as parcelas independentemente. Falta garantir faixa máxima, preço positivo no create, duas casas decimais, snapshot de preço e consistência entre valor persistido, autorizado, final, capturado e estornado.

O default real é **12%**, não os 5% do exemplo da visão. Não é necessariamente bug de arquitetura: o percentual é configurável. Para R$200 e taxa 5%, o cálculo local retorna R$10/R$190; com o default atual retorna R$24/R$176. A categoria é texto sem FK, então renomear/apagar categoria pode mudar o fallback de comissão de serviços existentes.

O recipient do prestador recebe `charge_processing_fee: true`; portanto `providerAmount` representa alocação antes das tarifas do gateway, **não valor líquido bancário garantido**. O dashboard chama esse valor de recebido. A opção `charge_remainder_fee` não é especificada; confirmar regra contratada. Com recipient da plataforma ausente fora da produção validada, só a parcela do prestador é enviada: não presumir que o gateway aceitará ou destinará corretamente a diferença.

Não há prova de split liquidado, reembolso efetivo, repasse bancário, política de autorização expirada para serviços futuros ou recuperação após timeout. O modelo tem estados RELEASED, mas não foi encontrado fluxo operacional que represente liberação real após confirmação.

### Conferência com documentação oficial

A documentação Core v5 informa que criação de pedidos suporta `Idempotency-key` e que sua janela no gateway é 24 horas; persistência local continua necessária para retries tardios. Isso fundamenta a recomendação de idempotência e confirma que `code: orderId` sozinho não a substitui. [Pagar.me — Idempotência](https://docs.pagar.me/docs/o-que-%C3%A9).

A orientação oficial de tokenização é enviar o cartão diretamente ao Pagar.me e usar o token no servidor; isso diverge do envio bruto atual. O endpoint de token usa chave pública e não deve receber Authorization, reforçando a necessidade de corrigir o interceptor global. [Tokenização](https://docs.pagar.me/reference/tokeniza%C3%A7%C3%A3o-1), [Criar token](https://docs.pagar.me/reference/criar-token-cart%C3%A3o-1).

Split depende da modalidade PSP; PIX com split depende de afiliação/configuração adequada. O código não comprova que essa capacidade está habilitada na conta. As regras enviadas na autorização não são sobrescritas por regras diferentes na captura, relevante para ajuste de preço. [Split](https://docs.pagar.me/reference/split-1), [PIX](https://docs.pagar.me/reference/pix-2), [Capturar cobrança com split](https://docs.pagar.me/reference/capturar-cobran%C3%A7a-com-split-1).

As fontes externas fundamentam requisitos do gateway; não substituem o código como fonte do estado atual. Não foi enviado nenhum pedido ao Pagar.me nesta auditoria.

## 8. Data Model Findings

### Integridade, relações e migrations

- **Positivo:** User email/CPF únicos; Provider 1:1 por PK com User; Payment e Avaliacao únicos por orderId; OrderCompletion/OrderAddress 1:1; favoritos únicos por cliente/prestador; tags com chave composta; identificadores externos de pagamento únicos. [schema][schema].
- **Positivo:** migration de backoffice impõe coerência `verified = (status = APPROVED)` e motivo em decisões sensíveis, além de FKs restritivas para auditoria. Transições administrativas gravam estado, decisão e audit log atomicamente. [migration admin][adminmigration].
- **Problema:** Order referencia Provider apenas via Service. Reassociação de serviço no cadastro muda quem é visto como prestador do pedido antigo. Guardar prestador contratado/snapshot e impedir a transferência indevida é requisito imediato.
- **Problema:** Service.category é String, sem relação com Category/Subcategory. O formulário trata IDs de subcategoria como IDs de Service. Padronizar classificação e não usar categorias como ofertas de terceiros.
- **Problema:** OrderDispute tem `orderId` sem FK e não identifica usuário autor, decisão, resolução ou financeiro. É estrutura inicial, não funcionalidade de disputas.
- **Problema:** dinheiro não possui precisão/escala explícita de moeda no Prisma (migrations usam Decimal amplo); sem CHECKs gerais para preço positivo, limites de nota/lat/lng/raio ou igualdade de split. DTOs ajudam, mas seeds/rotas alternativas podem romper invariantes.
- **Problema:** Order não guarda fim/duração, preço estimado é opcional e não preenchido no create, e service/basePrice permanece referência para fallback. Editar a oferta posteriormente pode alterar a estimativa exibida de pedido antigo.
- **Problema:** enums de pagamento duplicados em idiomas; houve migração com mapeamento de status e posterior reintrodução de nomes. Não declarar migration quebrada sem executar: o SQL faz CASE de conversão. Padronizar na aplicação e testar upgrade.
- **Problema:** OrderTimeline e OrderPhoto registram só o tipo de ator, sem actorId; timeline é incompleta e parcialmente sintética na leitura. AuditLog administrativo é mais maduro que o histórico transacional do marketplace.
- **Problema:** cascata de Order apaga avaliação e pagamento; média persistida do prestador não é recalculada ao excluir avaliação indiretamente. Histórico financeiro não deve ser deletável por usuário comum.

### Dashboard: significado dos números

`ProviderHomeService` filtra pedidos concluídos e pagamentos PAGO/CAPTURED/RELEASED para ganhos; soma `providerAmount`, com fallback para valor bruto. Usa `paidAt` para receita, mas `scheduledFor ?? requestedAt` para “completedAt” e serviços da semana, embora exista `clientConfirmedAt`. Assim, conclusão em data diferente do agendamento é atribuída ao período errado. “Últimos serviços” herda ordenação por solicitação, não por conclusão. “Serviço mais solicitado” conta títulos de todos os pedidos, inclusive cancelados/rejeitados, e pode juntar ofertas distintas com mesmo título. Não há indicador explícito de clientes únicos atendidos. O carregamento de todos os pedidos na memória e o snapshot enviado no login limitam atualização e escala. São números derivados de dados reais quando `providerHome` existe, mas não devem ser tratados como contabilidade ou repasse confirmado. [ProviderHomeService][dashboard], [ProviderHomePage][dashboardui].

### Payout profile: evolução já existente, ainda não integrada

A [migration de payout][payoutmigration] cria `ProviderPayoutProfile` com estados seguros, copia IDs legados e usa triggers para criar perfil ao inserir prestador e espelhar recipient do profile para Provider. Portanto, **não é correto afirmar que existem apenas duas colunas duplicadas sem sincronização**.

Mas o espelho de atualização é profile → Provider; update direto posterior na coluna legada não atualiza automaticamente o profile. Checkout continua lendo só o legado e não a condição READY/CONFIRMED. As funções de [pagarme-payout-capabilities.contract.ts][payoutcontract] e testes de sandbox são scaffolding de capacidades, não serviço de sincronização em runtime.

### Índices e performance

Há índices por clientId/serviceId, categoria, providerId, capturedAt e lat/lng. Eles não tornam a busca geográfica eficiente porque a query atual baixa coleções e filtra no browser. A query pública por categoria inclui todos os históricos/reviews e não pagina. O dashboard carrega todos os pedidos do prestador e agrega na memória.

Para o MVP: limitar payload e paginação; consultar último ponto com ordenação determinística; considerar índice `(providerId, capturedAt)`; usar bounding box e distância no servidor sem exigir PostGIS; dimensionar índice da reserva conforme filtro real e registrar plano de consulta com massa representativa. Não foi feita medição de latência/carga nesta auditoria: estes são riscos derivados do formato das queries, não tempos observados.

### Geolocalização e área de atendimento

O Haversine implementado em `Search.providerDistance` é adequado para distância geodésica aproximada em km, não rota/tempo de deslocamento. O problema principal é **qual ponto entra no cálculo e onde a regra é aplicada**: `locations[0]` não é garantidamente o mais recente, porque o backend não ordena; todo histórico é público; `ProviderServiceArea.active/mode/radiusKm/polygon` não participa da descoberta ou do aceite do pedido.

Não foi encontrado endpoint de escrita/manutenção de localização/área no runtime. Cadastro grava Address, não cria automaticamente ProviderLocation; seeds criam localizações e podem dar a falsa impressão de fluxo pronto. A região da UI pode ficar ausente porque o perfil público não inclui user.addresses, embora o template tente usá-los.

Recomendação mínima: centro público aproximado e raio operacional do prestador, consulta por localização do serviço, última localização privada apenas se necessária ao atendimento e com política de atualização/expiração. Validar área ao criar o pedido. Polígonos, tracking em tempo real e PostGIS podem esperar se o lançamento for delimitado por região.

### Seeds

[seeds.ts][seeds] fornece categorias, clientes, prestadores e agenda demonstrativa, além de administrador fixo. Há avaliações em pedidos ainda aguardando aprovação, sem recomputar ratingAvg/ratingCount; PIX AUTHORIZED em ordens preparadas para finalizar, enquanto confirmação exige PIX pago; datas de referência fixas em janeiro de 2026; recipients ausentes. Essas fixtures não provam happy path e não devem compor reputação/financeiro de lançamento.

## 9. UX / Functional Dead Ends

| Ponto da experiência | Onde o usuário fica preso ou é induzido a erro | Evidência |
|---|---|---|
| Final do cadastro | 400 por envelope `user`; subcategoria pode não corresponder a serviço; neighborhood também não existe em CreateAddressDto se enviado. | [cadastro HTTP][registerhttp], [cadastro payload][registerflow], [DTO endereço][addressdto]. |
| Oferecer serviço próprio | UI escolhe categorias/subcategorias; não há CRUD funcional para nova oferta/preço/agenda. | [registerservices][registerservices], [createservice][createservice]. |
| Perfil com várias ofertas | Usuário vê serviços, mas contratação sempre usa o primeiro do perfil. | [SingleUser.selectedService][bookingui]. |
| Sem availability | Não há slots, não pode solicitar e não há orientação operacional para prestador corrigir a agenda. | [availability][availability], [bookingui][bookingui]. |
| Endereço de atendimento | Usa primeiro endereço da sessão, não seletor; login não carrega endereços; pode falhar DTO ou omitir destino. | [login][login], [bookingui][bookingui]. |
| Solicitação enviada | Modal leva para home; não oferece continuidade direta ao pedido recém-criado; prestador depende de dados pendentes do login. | [bookingui][bookingui], [dashboardui][dashboardui]. |
| Pagamento do prestador novo | Erro “ainda não habilitado para receber”; não há caminho de configuração de recipient. | [createpayment][createpayment]. |
| PIX pendente/expirado | QR não atualiza automaticamente; a mesma cobrança pode ser reutilizada indefinidamente. | [checkout][checkout], [createpayment][createpayment]. |
| Estou a caminho/Iniciar | Botões existem mas PATCH recebe 400. | [orderhttp][orderhttp], [updatedto][updatedto]. |
| Reportar problema | Navega para `/orders/:id/report-problem`, sem rota correspondente; cai no fallback 404. | [detailsui][detailsui], [frontend routes][froutes]. |
| Cancelar como cliente | Não há fluxo dedicado de cancelamento pelo dono com política financeira. | [orderscontroller][orderscontroller], [detailsui][detailsui]. |
| Finalizar com foto | Arquivo é convertido em base64 e enviado em JSON; pode exceder limite do corpo; não existe upload separado. | [finishui][finishui]. |
| Conta com email/telefone novo | API cria código sem entregar; confirmação indisponível para usuário legítimo. | [verification][verification]. |
| Convite de operador | Serviço apenas registra log e frontend não tem tela de ativação. | [invitation][invitation], [adminroutes][adminroutes]. |
| Backoffice “Payments”/“Moderation” | Rotas abrem DashboardPage; não são módulos operacionais. | [adminroutes][adminroutes]. |
| Home do prestador recém-cadastrado | Registro não retorna providerHome; UI usa ganhos/clientes demonstrativos na falta dele. | [authcontroller][authcontroller], [dashboardui][dashboardui], [dashboarddata][dashboarddata]. |
| Entrada pela landing | Botões de lojas levam a `#`, sem aquisição funcional; marca difere de Proxi. | [landing][landing]. |

A busca tem tratamento de erro incompleto no carregamento principal, podendo parecer vazia quando há falha. O favorito no perfil deixa `favoriteLoading` preso em erro, porque o reset está no callback complete. São P2; devem ser corrigidos quando esses fluxos forem mantidos no escopo.

## 10. Missing MVP Features

O mínimo necessário para uma região/categoria inicial é:

1. Cadastro/login/recuperação utilizáveis, sem leitura/edição cruzada de contas.
2. Oferta própria com preço, duração, agenda mínima, região e prestador aprovado/financeiramente habilitado.
3. Descoberta local com dados públicos mínimos e verificação da área no pedido.
4. Solicitação com endereço e preço confiáveis, reserva concorrente segura e aceite/rejeição autenticados.
5. Pagamento homologado, idempotente, autenticidade de webhook, estados coerentes, cancelamento/reembolso e reconciliação de falhas.
6. Transições explícitas de deslocamento/início/fim/confirmação, com histórico real. No primeiro lançamento, preço fixo pode reduzir muito o risco.
7. Avaliação somente de contratação legítima e média/contagem corretas em busca/perfil.
8. Solicitação e mudanças de atendimento visíveis sem relogin; pelo menos um canal transacional confiável, sem exigir push nativo.
9. Operação mínima de suporte: consultar pedido/pagamento, bloquear fornecedor com efeito real, registrar reclamação e resolver financeiro com auditoria. Painéis sofisticados podem esperar.
10. Ambiente de homologação/produção configurado, logs de falhas, alertas financeiros, backup/restauração verificados e jornada real de aceite.

Não são exigências do primeiro MVP: dez categorias completas, mapas de deslocamento em tempo real, PostGIS, app nativo/Ionic, chat próprio, planos Premium, anúncios pagos, BI avançado, polígono sofisticado, fila distribuída ou microserviços. Fotos podem ser removidas do escopo até haver upload seguro. Uma operação interna assistida para onboarding de poucos prestadores pode ser aceitável se explícita e auditada; não equivale à jornada autônoma que hoje se pretende.

## 11. Technical Debt

### Resolver antes de expor o produto

- Autorizações e projeções de dados; contratos HTTP reais; estados e valores financeiros; reserva concorrente; prontidão do prestador.
- Remover endpoints de scaffolding que aparentam sucesso, ou desabilitar telas associadas até entregá-los.
- Tirar dados demo do fallback do dashboard e bloquear seeds de desenvolvimento em produção.
- Harmonizar snapshots e enum financeiro; preservar registros auditáveis e remover exclusão arbitrária.
- Testes de contrato negativos e um percurso sem mocks de API, com gateway sandbox isolado.

### Pode esperar após o lançamento controlado

- Dividir AdminProvidersService por leitura/dashboard/transição quando o custo de manutenção justificar.
- Reduzir `any`, consolidar aliases e nomes TaskGo/Proxi/ODIN, revisar lockfiles locais versus instalação raiz e versões Nx divergentes.
- Paginação otimizada e agregações SQL do dashboard conforme volume; primeiro impor limites razoáveis.
- Reputação com distribuição/tags e paginação elegante de recentes, desde que média e avaliações legítimas básicas estejam corretas.
- Plataforma de flags completa; hoje há serviço CRUD placeholder e serviço separado de flag por ambiente.
- Premium: adicionar planos, assinatura e direitos de uso depois; arquitetura modular permite extensão localizada. Não existe assinatura implementada.
- Patrocínio: entidade de campanha/período e ranking marcado como patrocinado; flags visuais `premium` não representam cobrança/entitlement. Não usar score de reputação como mecanismo de destaque pago.

A comissão já tem pontos de configuração e snapshot no pagamento. É possível evoluir a monetização sem reescrever o produto, **desde que o núcleo de oferta, preço, pedido e Payment seja corrigido primeiro**. Percentuais variáveis futuros exigem versionar a política aplicada à contratação, não recalculá-la silenciosamente após alterações do catálogo.

## 12. Test Matrix

Esta matriz é proposta de aceite/regressão; não representa testes todos executados. P0 são gates de lançamento.

| Fluxo | Cenário | Resultado esperado | Prioridade |
|---|---|---|---|
| Cliente / cadastro | Formulário real completo → API real | Conta e endereço persistidos, token e navegação corretos. | P0 |
| Cliente / cadastro | Email/CPF duplicados, body inválido e campos extras | Erro de domínio sem registro parcial nem vazamento. | P1 |
| Prestador / cadastro | Selecionar subcategoria válida | Cria oferta própria; nenhum serviço/pedido alheio muda de dono. | P0 |
| Auth | Login correto/incorreto, token expirado | Identidade correta; erro uniforme, sem hash e com limite de tentativas. | P0 |
| Auth | Token admin em API cliente e vice-versa | Rejeição por finalidade, mesmo com IDs iguais. | P1 |
| Conta | Cliente A altera senha/email/CPF/tipo de B | 403/404; nada é alterado. | P0 |
| Conta | Reset/confirmar código válido, expirado, repetido | Entrega efetiva, TTL, uso único e revogação conforme política. | P1 |
| Segurança / leitura | APIs públicas de prestador e listagens autenticadas | Nenhum hash/CPF privado, raw financeiro ou histórico preciso indevido. | P0 |
| Segurança / rede | Consulta CEP com usuário logado | JWT nunca é enviado a terceiro. | P1 |
| Endereço | Criar/editar/default/remover próprio e tentar endereço alheio | Ownership e contrato corretos; default consistente. | P0 |
| Descoberta | Categoria, preço, nota e raio compatíveis | Retorna somente prestadores elegíveis que atendem o local. | P0 |
| Descoberta | Dois pontos históricos; último fora do raio | Usa ponto definido pela política, não `locations[0]` arbitrário. | P1 |
| Descoberta | Permissão GPS negada, coordenadas ausentes, CEP falha | Usa endereço selecionado ou informa como prosseguir. | P1 |
| Descoberta | PENDING/REJECTED/BLOCKED | Não pode ser contratado por URL direta nem pela busca. | P0 |
| Prestador / oferta | Criar, editar preço/agenda, inativar | Persiste oferta própria e protege pedidos existentes. | P0 |
| Prestador / oferta | Tentar editar/transferir serviço de outro | 403/404, nenhuma reassociação. | P0 |
| Agenda | Slot válido, fora da janela, passado e sem disponibilidade | Somente slot futuro permitido. | P0 |
| Agenda | Duas requisições simultâneas ao mesmo slot | Só uma reserva efetiva; conflito explícito para outra. | P0 |
| Agenda | Serviços diferentes do mesmo prestador sobrepostos | Conflito detectado por prestador/intervalo. | P0 |
| Agenda | Cancelar/expirar reserva pendente | Horário liberado conforme política; financeiro coerente. | P1 |
| Agenda | Intervalo público excessivo | Limite determinístico sem consumo descontrolado. | P1 |
| Pedido | Contratar com endereço do cadastro/perfil | Snapshot mínimo válido preserva local escolhido. | P0 |
| Pedido | Forjar clientId/finalPrice/serviceId de terceiro | Identidade/preço definidos pelo servidor; operação indevida recusada. | P0 |
| Pedido | Ler, listar, aceitar, cancelar, agendar e excluir pedido alheio | Sem acesso/escrita para não participante. | P0 |
| Prestador / aceite | Dono aceita/rejeita, pedido repetido ou estado incompatível | Transição única, histórico e cliente informado. | P0 |
| Prestador / execução | Agendado pago → deslocamento → início | UI/API funcionam; participante/estado/pagamento validados. | P0 |
| Prestador / execução | PIX pendente, falho ou devolvido | Execução não liberada indevidamente. | P0 |
| Prestador / conclusão | Finalizar com notas, preço fixo/ajuste autorizado | Aguarda confirmação e registra ator/data. | P0 |
| Prestador / conclusão | Finalizações concorrentes e repetidas | Sem sobrescrita de conclusão, fotos/eventos duplicados. | P1 |
| Evidências | Imagem permitida, excessiva, formato falso e URL arbitrária | Limites backend; arquivo autorizado ou recurso desabilitado. | P1 |
| Pagamento / PIX | Criar e pagar sandbox, webhook legítimo | Valor/split corretos, estado coordenado e UI atualizada. | P0 |
| Pagamento / PIX | QR expirado e reabrir checkout | Nova tentativa segura ou instrução clara; não reusar eternamente. | P1 |
| Pagamento / cartão | Autorizar sem capturar e confirmar após serviço | Captura única do valor acordado; conclusão somente com confirmação financeira. | P0 |
| Pagamento / cartão | HTTP 2xx com cobrança recusada/captura falha | Não grava autorização/pagamento bem-sucedido. | P0 |
| Pagamento / duplicação | Duplo clique, duas abas, timeout e retry | Uma operação externa e histórico íntegro. | P0 |
| Pagamento / troca | PIX pendente → cartão e PIX antigo pago depois | Não há dupla cobrança silenciosa nem evento órfão ignorado. | P0 |
| Webhook | Sem credencial/origem comprovada ou charge/valor de outra conta | Rejeitado; nenhum estado financeiro alterado. | P0 |
| Webhook | Repetido, fora de ordem e anterior à persistência local | Processamento idempotente, sem regressão, com recuperação. | P0 |
| Captura | Gateway captura, banco falha; cliente confirma de novo | Reconciliação conclui sem capturar em dobro. | P0 |
| Valor final | Autoriza 120 e propõe 150 ou 100 | Política explícita; valor pago/split/final iguais ao acordado. | P0 |
| Cancelamento | Antes/depois de autorização, após PIX pago, retry de refund | Cancelamento/estorno coerentes e auditáveis. | P0 |
| Recipient | Ausente, pendente, rejeitado, bloqueado e pronto | Só pronto pode receber; configuração não expõe dados bancários. | P0 |
| Split | Comissão 0%, 5%, default, limite e centavo residual | Soma exata, valores não negativos e tarifa distinta de parcela. | P0 |
| Cliente / confirmação | Dono confirma; terceiro ou repetição tenta confirmar | Confirmação única; terceiro recusado; resultado recuperável. | P0 |
| Cliente / problema | Não concorda com conclusão/preço | Registra solicitação de suporte e mantém dinheiro sob política definida. | P0 |
| Avaliação | Concluído pelo cliente real, nota 1/5, tags válidas | Uma avaliação; média/contagem atualizadas. | P0 |
| Avaliação | Antes da conclusão, autoavaliação, duplicada, nota 0/6 | Rejeitado; reputação inalterada. | P0 |
| Avaliação | Pedidos diferentes avaliados simultaneamente | Agregados corretos; conflito serializável tratado/repetível. | P1 |
| Reputação | Exclusão/moderação/cancelamento posterior | Histórico e agregados seguem política; sem nota fantasma. | P1 |
| Dashboard | Nova solicitação após login e retorno à home | Atualiza pendentes/indicadores sem relogin; nunca dados demo. | P1 |
| Dashboard | Finalizado em mês diferente do agendamento | Data real de conclusão/financeiro usada; líquido corretamente nomeado. | P1 |
| Admin | Aprovar/rejeitar/bloquear e concorrência de decisões | Estado/decisão/auditoria atômicos e efeito no marketplace. | P0 |
| Admin | SUPPORT/FINANCE/MODERATOR sem capability | Backend nega ação; UI coerente, tentativa rastreável. | P0 |
| Admin | Desativar operador, token antigo, último administrador | Revogação imediata e proteção operacional. | P1 |
| Admin | Convidar/ativar operador com token expirado/usado | Entrega/tela reais, uso único e auditoria. | P1 |
| Admin | Consultar pedido/pagamento e resolver reclamação | Dados mínimos, resolução rastreável, ação financeira segura. | P0 |
| Infra | Deploy com env de produção e deep link | API correta, HTTPS, sem localhost/simulação/dados demo. | P0 |
| Infra | Backup → restauração em ambiente isolado | Dados e migrations recuperáveis com evidência. | P0 |
| Observabilidade | Gateway indisponível e webhook falhando | Alerta acionável com orderId/requestId, sem cartão/segredos. | P1 |

### Verificações executadas nesta auditoria

```text
VERIFICATION REPORT
-------------------
Claim: As oito suítes isoladas selecionadas passaram; não é certificação E2E.
Command: npm exec --workspace apps/backend -- jest --runInBand --no-cache --runTestsByPath src/modules/order/commands/create-order/create-order.handler.spec.ts src/modules/order/commands/confirm-order-completion/confirm-order-completion.handler.spec.ts src/modules/order/commands/create-order-review/create-order-review.handler.spec.ts src/modules/payments/commands/create-order-payment/create-order-payment.handler.spec.ts src/modules/payments/commands/process-pagarme-webhook/process-pagarme-webhook.handler.spec.ts src/modules/payments/payment.service.spec.ts src/modules/provider/provider.service.spec.ts src/modules/auth/auth-guard.spec.ts
Executed: 13/09/2026, nesta auditoria, sem alteração de código.
Exit code: 0
Output summary: Test Suites: 8 passed, 8 total; Tests: 43 passed, 43 total.
Warnings: Nenhum no output destas suítes.
Errors: Nenhum.
Verdict: PASS
```

```text
VERIFICATION REPORT
-------------------
Claim: Checagem TypeScript sem emissão passou nos três projetos.
Command: ./node_modules/.bin/tsc --project apps/backend/tsconfig.build.json --noEmit --incremental false
Command: ./node_modules/.bin/tsc --project apps/frontend/tsconfig.app.json --noEmit --incremental false
Command: ./node_modules/.bin/tsc --project apps/backoffice/tsconfig.app.json --noEmit --incremental false
Executed: 13/09/2026, nesta auditoria, sem alteração de código.
Exit code: 0 em cada execução.
Output summary: Sem diagnósticos.
Warnings: Não valida templates Angular, bundle, Docker ou runtime.
Errors: Nenhum diagnóstico TypeScript.
Verdict: PASS
```

```text
VERIFICATION REPORT
-------------------
Claim: Falhas de contrato e interpretação financeira reproduzidas isoladamente.
Command: node -r ts-node/register/transpile-only (scripts inline, cwd apps/backend)
Executed: 13/09/2026, nesta auditoria.
Exit code: 0
Output summary:
  cadastro usado pelo frontend: 400, "property user should not exist"
  cadastro plano controle: ACCEPTED
  inicio usado pelo frontend: 400, "property status should not exist"
  pedido com endereco de perfil: 400 para label/id/country/isDefault
  capture returned failed => success-shaped result: true
  authorization returned failed => saved payment status: AUTORIZADO
Warnings: DTOs/handlers reais, doubles para Prisma/gateway; nenhum HTTP externo ou banco modificado.
Errors: Uma tentativa inicial na raiz falhou por resolução local de ts-node; repetida no workspace backend com sucesso.
Verdict: PASS para reprodução dos defeitos, não para funcionamento do produto.
```

## 13. Launch Readiness

As notas são julgamento de engenharia sobre o checkout, não métricas de produção nem percentuais de cobertura. Prontidão não é média aritmética: um P0 de segurança/financeiro veta lançamento.

| Dimensão | Nota / 10 | Fundamentação |
|---|---:|---|
| Funcionalidade | 3 | Muitos componentes reais, mas cadastro, oferta e execução interrompem o ciclo. |
| Segurança | 1 | Hash público, IDOR e alteração de contas; controles bons existem em domínios específicos. |
| Pagamentos | 1 | Integração inicial, sem garantias contra fraude, duplicação e inconsistência. |
| Confiabilidade | 2 | Transações locais positivas, mas concorrência e falhas entre banco/gateway sem recuperação. |
| Observabilidade | 4 | OTel, métricas/admin, dashboards e CI presentes; sem demonstração operacional financeira. |
| UX | 3 | Telas de contratação/conclusão úteis, mas ações falham, estados são incompletos e dados demo aparecem. |
| Manutenibilidade | 5 | Organização por domínio e testes ajudam; contratos frouxos e duplicação de regras prejudicam evolução. |
| **Geral** | **2** | **ALPHA interna. Não aprovar soft launch com usuários/dinheiro reais.** |

Para CLOSED BETA com participantes convidados, os vazamentos e alterações indevidas já precisam estar eliminados. Para SOFT LAUNCH READY, exigir os gates P0, operação financeira homologada, percurso real e recuperação demonstrada. O volume de telas e testes verdes não altera esse critério.

## 14. Recommended Roadmap

### ANTES DO LANÇAMENTO

1. **Fechar exposição e autorização:** DTOs públicos, conta própria, ownership de pedidos, writes administrativos, tokens por domínio. Bloquear exclusão destrutiva.
2. **Consertar entrada e oferta:** alinhar cadastro/endereço, separar classificação de serviço, permitir oferta/agenda mínima e habilitação de recebedor. Aplicar aprovação/bloqueio.
3. **Fechar contratação e execução:** serviço selecionável, preço/endereço snapshot, reserva segura por prestador, transições explícitas e timeline verdadeira.
4. **Fechar o financeiro:** tokenização, autenticidade de webhook, idempotência, resultado do gateway, estados, preço final, cancelamento/refund, recuperação de falhas e política real de repasse. Homologar inicialmente uma política simples de preço/pagamento.
5. **Operação mínima:** solicitações atualizadas e aviso transacional, reclamação/suporte com auditoria, sem indicadores fictícios.
6. **Publicação controlada:** ambiente correto, sem dados demo, backup restaurado, alertas essenciais e percurso completo real em sandbox. Só então abrir uma região/categoria e capacidade limitadas.

### PRIMEIROS 100 USUÁRIOS

Medir busca → perfil → solicitação → aceite → pagamento → conclusão → avaliação, além de tempo de aceite, cancelamentos, falhas de cobrança e necessidade de suporte. Corrigir abandono e incidentes; conferir conciliação diariamente pela operação até automatização suficiente. Melhorar dashboard, recentes/reputação e paginação com dados reais. Expandir regiões/categorias somente com oferta e capacidade operacional.

### APÓS VALIDAÇÃO

Experimentar comissão compatível com aquisição e margem; depois Premium com benefícios concretos e patrocínio identificado. Evoluir mapas, análises e aplicativos nativos se uso justificar. Separação de repositórios, microserviços e migração para PostGIS não são pré-requisitos desta validação.

## 15. Suggested Tasks

As tarefas abaixo são propostas; nenhuma foi iniciada. A ordem prioriza risco, depois dependências da jornada. P0 de lançamento podem exigir várias tasks pequenas em sequência.

### TASK-001

Título: Eliminar dados sensíveis das leituras de prestadores e usuários.

Prioridade: P0.

Problema: S01; queries retornam entidades completas.

Objetivo: Tornar públicas apenas as informações necessárias à descoberta.

Arquivos/módulos provavelmente afetados: provider queries, user queries/listagem, mappers e BigIntInterceptor (manter serialização, não usá-lo como política de acesso).

Critérios de aceite: GETs públicos não retornam hash, CPF, contatos privados, dados de pagamento ou histórico exato; testes recursivos de payload; endereço/região pública definidos explicitamente.

### TASK-002

Título: Restringir alterações de conta ao usuário autenticado.

Prioridade: P0.

Problema: S02; alteração/exclusão/verificação por ID externo.

Objetivo: Proteger perfil e credenciais.

Arquivos/módulos provavelmente afetados: UserController, UserService, UpdateUserDto, guards, frontend perfil.

Critérios de aceite: A não lê dados privados nem altera senha/email/tipo de B; senha/tipo têm fluxos próprios; mudanças de contato invalidam verificação anterior; testes de duas contas.

### TASK-003

Título: Aplicar participação e identidade da sessão a pedidos.

Prioridade: P0.

Problema: S03; IDs da URL/body controlam autorização.

Objetivo: Proteger leitura, aceite e alterações existentes.

Arquivos/módulos provavelmente afetados: OrderController, queries de pedido, accept/cancel/update/schedule handlers.

Critérios de aceite: Todas as leituras são restritas a participante autorizado; cliente/prestador de sessão controla ações; terceiros falham; clientId não é aceito como autoridade.

### TASK-004

Título: Remover exclusão arbitrária de pedidos e campos históricos editáveis.

Prioridade: P0.

Problema: S03 e integridade de histórico/reputação.

Objetivo: Preservar pedido, cobrança e prestador contratados.

Arquivos/módulos provavelmente afetados: RemoveOrderHandler, UpdateOrderHandler, DTOs, schema e regras de serviço.

Critérios de aceite: API comum não apaga pedido/Payment/review; não troca cliente/serviço de pedido existente; cancelamento passa por fluxo específico.

### TASK-005

Título: Separar finalidades dos tokens e limitar envio no frontend.

Prioridade: P1.

Problema: S05/S06.

Objetivo: Não confundir domínios de identidade nem enviar JWT a terceiros.

Arquivos/módulos provavelmente afetados: AuthTokenService/AuthGuard, AdminAuthTokenService, tokenInterceptor.

Critérios de aceite: Token admin não autentica cliente com mesmo ID; token cliente não autentica admin; nenhuma chamada CEP/gateway de tokenização recebe JWT Proxi.

### TASK-006

Título: Alinhar o contrato real de cadastro.

Prioridade: P0.

Problema: C01 e campos extras de endereço.

Objetivo: Cadastro cliente UI→API funcional.

Arquivos/módulos provavelmente afetados: UserRegister, RegisterUser, AuthRegisterDTO, CreateAddressDto, contratos compartilhados.

Critérios de aceite: Formulário real cria conta/endereço e sessão; duplicados são tratados; teste integrado sem interceptar cadastro; campos opcionais coerentes.

### TASK-007

Título: Separar subcategoria de oferta no onboarding do prestador.

Prioridade: P0.

Problema: C03; transferência de serviço alheio.

Objetivo: Criar ofertas do novo prestador com classificação válida.

Arquivos/módulos provavelmente afetados: register/services, UserServiceValidator, CreateProviderHandler, Service/Category/Subcategory.

Critérios de aceite: Nenhum `connect` de oferta alheia no cadastro; IDs inválidos geram erro; serviços/pedidos existentes permanecem com proprietário original; transação de onboarding íntegra.

### TASK-008

Título: Implementar CRUD mínimo de oferta e agenda semanal própria.

Prioridade: P0.

Problema: C06; handlers placeholder.

Objetivo: Prestador configurar preço, duração, disponibilidade e ativação.

Arquivos/módulos provavelmente afetados: services commands/queries/DTOs, frontend prestador.

Critérios de aceite: Persistência real e ownership; serviço inativo não é oferecido; availability validada gera slots; preço de pedido já criado permanece estável.

### TASK-009

Título: Aplicar aprovação e bloqueio a descoberta e contratação.

Prioridade: P0.

Problema: C07.

Objetivo: Tornar decisões administrativas efetivas.

Arquivos/módulos provavelmente afetados: provider queries, CreateOrderHandler, ProviderService, AuthGuard conforme política.

Critérios de aceite: PENDING/REJECTED/BLOCKED não recebe novo pedido nem aparece como contratável; URL direta não contorna; pedidos já existentes seguem política documentada.

### TASK-010

Título: Selecionar serviço/endereço e calcular preço no backend.

Prioridade: P0.

Problema: C05/P05 e seleção fixa da primeira oferta.

Objetivo: Contratação com snapshot correto.

Arquivos/módulos provavelmente afetados: SingleUser, CreateOrderDto/Handler, OrderAddress, perfil/sessão.

Critérios de aceite: UI seleciona oferta e endereço; API valida ownership do endereço e serviço; rejeita preço forjado; guarda estimativa, prestador e duração contratados.

### TASK-011

Título: Garantir reserva única por prestador e intervalo.

Prioridade: P0.

Problema: C04.

Objetivo: Eliminar dupla reserva e agendamento inválido.

Arquivos/módulos provavelmente afetados: ProviderService, create/schedule handlers, schema/migration de reserva.

Critérios de aceite: Teste concorrente real só reserva uma vez; serviços diferentes não sobrepõem; passado e horizonte excessivo recusados; política de expiração/liberação testada.

### TASK-012

Título: Implementar deslocamento e início com transições explícitas.

Prioridade: P0.

Problema: C02; PATCH status rejeitado.

Objetivo: Chegar legitimamente a EM_ANDAMENTO.

Arquivos/módulos provavelmente afetados: OrderController/commands, Order HTTP, OrderDetailsPage, ProviderHomePage.

Critérios de aceite: Agendado garantido→deslocamento→início funciona na UI; ator/estado/pagamento validados; repetições e concorrência seguras; eventos com datas reais.

### TASK-013

Título: Autenticar e validar o webhook Pagar.me.

Prioridade: P0.

Problema: S04/P01.

Objetivo: Impedir evento financeiro forjado.

Arquivos/módulos provavelmente afetados: PaymentsController, webhook DTO/handler, configuração.

Critérios de aceite: Origem homologada comprovada; assinatura/credencial inválida ou recurso de outra conta não altera banco; evento legítimo funciona com payload real sandbox.

### TASK-014

Título: Persistir tentativa financeira e chave idempotente.

Prioridade: P0.

Problema: P02 e troca de método.

Objetivo: Uma cobrança por operação lógica, mesmo com timeout/duplo clique.

Arquivos/módulos provavelmente afetados: Payment/tentativas, CreateOrderPaymentHandler, PagarmeService.

Critérios de aceite: Chave persistida antes da chamada; concorrência/retry usa mesma operação; IDs anteriores não desaparecem; troca de método tem tratamento explícito de cobrança anterior.

### TASK-015

Título: Mapear respostas financeiras e coordenar Order/Payment.

Prioridade: P0.

Problema: P03/P04/P12.

Objetivo: Só agendar/concluir com estado financeiro realmente válido.

Arquivos/módulos provavelmente afetados: PagarmeService, PaymentService, create/webhook/confirm handlers, enums.

Critérios de aceite: Recusa em HTTP 2xx não vira autorização; PIX pendente não libera execução; status antigos mapeados; falha/reembolso preserva coerência e timeline.

### TASK-016

Título: Recuperar webhook adiantado, repetido e fora de ordem.

Prioridade: P0.

Problema: P08; perda/regressão de eventos.

Objetivo: Processamento durável e recuperável.

Arquivos/módulos provavelmente afetados: PaymentWebhookEvent, ProcessPagarmeWebhookHandler, rotina de reconciliação.

Critérios de aceite: Evento sem vínculo fica pendente; encontra cobrança posteriormente; replay não duplica efeitos; eventos antigos não revertem reembolso sem validação canônica.

### TASK-017

Título: Tornar captura e confirmação recuperáveis.

Prioridade: P0.

Problema: P06.

Objetivo: Superar falha banco/gateway sem cobrança dupla.

Arquivos/módulos provavelmente afetados: ConfirmOrderCompletionHandler, PaymentService, estado de operação financeira.

Critérios de aceite: Duas confirmações não geram duas operações; captura seguida de erro de banco é reconciliada; resultado de negócio validado antes de conclusão definitiva.

### TASK-018

Título: Definir e aplicar preço final coerente com captura e split.

Prioridade: P0.

Problema: P05/P14.

Objetivo: Cobrar e repartir exatamente o acordado.

Arquivos/módulos provavelmente afetados: FinishOrderHandler, confirmação, Payment, checkout, gateway.

Critérios de aceite: Política MVP explícita de preço fixo ou ajuste; aumento/redução não conclui com valor antigo; comissão/tarifa/parcela diferenciadas; promessa de liberação homologada.

### TASK-019

Título: Conectar cancelamento e reembolso ao pedido.

Prioridade: P0.

Problema: P07.

Objetivo: Cancelar serviço sem deixar cobrança indevida.

Arquivos/módulos provavelmente afetados: cancel commands, PaymentsModule, operação admin mínima.

Critérios de aceite: Antes/depois de pagamento tratados; estorno idempotente e auditado; falha externa permanece recuperável; pedido não é apagado.

### TASK-020

Título: Habilitar recipient e readiness de pagamento.

Prioridade: P0.

Problema: P10 e shadow legado.

Objetivo: Prestador aprovado conseguir receber com configuração válida.

Arquivos/módulos provavelmente afetados: ProviderPayoutProfile, PagarmeService, onboarding/admin, CreateOrderPaymentHandler.

Critérios de aceite: Perfil pronto governando checkout; recipient sincronizado sem dados bancários completos nas respostas; cenário sandbox split de dois recebedores confirmado; falha/pendência bloqueia recebimento.

### TASK-021

Título: Tokenizar cartão e reduzir payloads financeiros persistidos.

Prioridade: P1, obrigatório se cartão for lançado.

Problema: P13.

Objetivo: Remover cartão bruto do backend.

Arquivos/módulos provavelmente afetados: OrderPaymentPage, CardPaymentDto, PagarmeService, rawProviderResponse/webhook.

Critérios de aceite: API recebe token, sem PAN/CVV; respostas/logs/banco sem esses dados; tokenização segue documentação da conta e erros são recuperáveis.

### TASK-022

Título: Atualizar checkout PIX e tratar expiração/timeout.

Prioridade: P1.

Problema: P09/P11.

Objetivo: Pagamento não ficar preso em QR antigo ou chamada indefinida.

Arquivos/módulos provavelmente afetados: checkout, create/get payment, PagarmeService.

Critérios de aceite: Estado se atualiza, QR expirado não é reutilizado, timeout não dispara cobrança duplicada e usuário recebe ação útil.

### TASK-023

Título: Dashboard real e solicitações atualizadas.

Prioridade: P1.

Problema: C08.

Objetivo: Prestador enxergar trabalho e valores atuais.

Arquivos/módulos provavelmente afetados: ProviderHomeService, API autenticada, ProviderHomePage/data.ts.

Critérios de aceite: Sem fallback fictício; nova solicitação aparece sem relogin; conclusão usa data correta; parcela não é rotulada como repasse bancário; limite/paginação das listas.

### TASK-024

Título: Entregar avisos de pedido e recuperação de acesso.

Prioridade: P1.

Problema: Notificações/recuperação incompletas.

Objetivo: Usuários conseguirem responder e recuperar conta.

Arquivos/módulos provavelmente afetados: auth/verification, eventos de pedido, delivery service.

Critérios de aceite: Canal efetivo de entrega, TTL/tentativas, falhas rastreáveis sem segredos; avisos de solicitação/aceite/conclusão; backend continua fonte de estado.

### TASK-025

Título: Criar suporte mínimo para problema no atendimento.

Prioridade: P0 para atendimento pago.

Problema: C09 e rota report-problem inexistente.

Objetivo: Registrar e resolver reclamação com política financeira.

Arquivos/módulos provavelmente afetados: rota/tela cliente, OrderDispute, admin consulta de pedido/pagamento.

Critérios de aceite: Cliente participante abre ocorrência vinculada por FK; operação consulta e registra resolução; financeiro segue TASK-019, com papel e auditoria.

### TASK-026

Título: Busca por região/raio com dados mínimos.

Prioridade: P1, requisito central do soft launch local.

Problema: Geolocalização só visual e área ignorada.

Objetivo: Retornar prestadores que atendem o endereço sem expor histórico preciso.

Arquivos/módulos provavelmente afetados: provider queries/DTOs, ProviderServiceArea/Location, Search e mapa.

Critérios de aceite: Último ponto/região conforme política; limite/paginação; área validada na contratação; GPS negado tem alternativa; casos dentro/fora do raio testados.

### TASK-027

Título: Preservar legitimidade da reputação e leitura consistente.

Prioridade: P1.

Problema: Dependências de ownership e exclusão, concorrência e seeds inconsistentes.

Objetivo: Média/contagem representarem avaliações válidas.

Arquivos/módulos provavelmente afetados: CreateOrderReviewHandler, leitura de perfil, seeds e regra de moderação.

Critérios de aceite: Só dono legítimo de serviço concluído avalia; concorrência tratada; alteração/moderação não deixa agregado antigo; recentes ordenadas e dados demo fora de produção.

### TASK-028

Título: Restringir catálogo administrativo e concluir convites.

Prioridade: P1.

Problema: S08/C11 e entrega/ativação ausentes.

Objetivo: Operação segura do catálogo e operadores.

Arquivos/módulos provavelmente afetados: CategoriesController/Service, AdminInvitationDeliveryService, rota de ativação backoffice.

Critérios de aceite: Cliente/prestador não escreve categorias; create aguarda transação; convite chega e ativa por uso único; ações sensíveis auditadas.

### TASK-029

Título: Preparar ambiente publicável sem dados e acessos de demonstração.

Prioridade: P0.

Problema: C10/S09/P15.

Objetivo: Homologação e produção reproduzíveis.

Arquivos/módulos provavelmente afetados: environments, Docker/build/deploy, seeds, configuração de segredos/observabilidade.

Critérios de aceite: Frontend usa API correta; sem simulação no ambiente de dinheiro real; seed demo bloqueado; primeiro admin seguro; backup restaurado, healthcheck e alerta demonstrados.

### TASK-030

Título: Criar gate E2E da jornada completa com contratos reais.

Prioridade: P0.

Problema: Testes atuais deixam regressões entre UI/API invisíveis.

Objetivo: Aceite reproduzível de cadastro até avaliação.

Arquivos/módulos provavelmente afetados: Cypress frontend, E2E backend, sandbox Pagar.me e CI isolado.

Critérios de aceite: Cadastro, oferta, reserva, aceite, pagamento, início, conclusão, confirmação e avaliação sem alteração manual de status; API não interceptada no percurso de aceite; banco descartável identificado; casos negativos P0 da matriz executados; relatório explicita o que usa sandbox/mocks.

### TASK-031

Título: Limitar evidências fotográficas ou retirá-las do primeiro MVP.

Prioridade: P2, antes de anunciar upload como disponível.

Problema: S10; Data URLs sem pipeline de arquivo.

Objetivo: Finalização não falhar por fotos nem expor arquivos indevidos.

Arquivos/módulos provavelmente afetados: FinishServicePage/DTO/Handler, storage se mantido.

Critérios de aceite: Fotos desabilitadas explicitamente ou upload com tamanho/formato/ownership validados; JSON só guarda referência controlada; sem base64 ilimitado no banco.

### TASK-032

Título: Completar histórico real das transições e eliminar eventos sintéticos.

Prioridade: P1.

Problema: Timeline parcial e datas derivadas imprecisas.

Objetivo: Cliente, prestador e suporte verem o ocorrido.

Arquivos/módulos provavelmente afetados: OrderTimeline, create/accept/cancel/start/finish/confirm, GetOrderDetailsHandler.

Critérios de aceite: Todas as transições relevantes registram ator/data na mesma gravação local; UI não inventa data de evento; repetições não duplicam histórico.

### TASK-033

Título: Corrigir pontos de entrada da landing e navegação sem saída.

Prioridade: P2, obrigatória antes de usar a landing para aquisição.

Problema: Links de lojas/termos e destinos inconsistentes.

Objetivo: Entrada funcional para a experiência web do MVP.

Arquivos/módulos provavelmente afetados: landing-page/index.html, rotas frontend, modal de solicitação.

Critérios de aceite: CTAs abrem cadastro/busca reais; não anunciam app inexistente; solicitação leva ao pedido; nomes/destinos consistentes; links necessários têm conteúdo publicado.

<!-- Evidências locais verificadas no checkout auditado. -->

[accept]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/backend/src/modules/order/commands/confirm-order-by-provider/confirm-order-by-provider.handler.ts:13
[addressdto]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/backend/src/modules/address/dto/create-address.dto.ts:10
[addresses]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/backend/src/modules/address/address.service.ts:35
[adminauthmodule]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/backend/src/modules/admin/auth/admin-auth.module.ts:41
[adminguard]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/backend/src/modules/admin/auth/admin-auth.guard.ts:22
[adminmigration]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/backend/src/prisma/migrations/20260702120000_add_backoffice_admin_provider_audit_models/migration.sql:1
[adminproviders]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/backend/src/modules/admin/providers/admin-providers.service.ts:528
[adminroutes]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/backoffice/src/app/app.routes.ts:18
[admintoken]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/backend/src/modules/admin/auth/admin-auth-token.service.ts:6
[apkg]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/backoffice/package.json:1
[appmodule]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/backend/src/app.module.ts:63
[authcontroller]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/backend/src/modules/auth/auth.controller.ts:19
[authguard]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/backend/src/modules/auth/auth.guard.ts:56
[authmodule]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/backend/src/modules/auth/auth.module.ts:39
[availability]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/backend/src/modules/provider/provider.service.ts:105
[bdocker]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/backend/dockerfile:1
[bigint]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/backend/src/shared/interceptors/bigint.interceptor.ts:31
[bookingui]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/frontend/src/app/modules/common/single-user/single-user.ts:189
[bpkg]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/backend/package.json:1
[bycategory]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/backend/src/modules/provider/queries/get-providers-by-category/get-providers-by-category.handler.ts:7
[cancel]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/backend/src/modules/order/commands/cancel-order-by-provider/cancel-order-by-provider.handler.ts:13
[capture]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/backend/src/modules/payments/payment.service.ts:15
[categories]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/backend/src/modules/categories/categories.service.ts:18
[categoriescontroller]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/backend/src/modules/categories/categories.controller.ts:20
[checkout]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/frontend/src/app/modules/orders/order-payment/order-payment.page.ts:16
[ci]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/.github/workflows/ci.yml:1
[compose]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/docker-compose.yml:1
[config]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/backend/src/config/config.module.ts:23
[confirm]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/backend/src/modules/order/commands/confirm-order-completion/confirm-order-completion.handler.ts:22
[createdto]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/backend/src/modules/order/dto/create-order.dto.ts:49
[createorder]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/backend/src/modules/order/commands/create-order/create-order.handler.ts:18
[createpayment]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/backend/src/modules/payments/commands/create-order-payment/create-order-payment.handler.ts:31
[createservice]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/backend/src/modules/services/commands/create-service/create-service.handler.ts:6
[cypress]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/frontend/cypress/e2e/customer-journey.cy.ts:1
[dashboard]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/backend/src/modules/auth/provider-home.service.ts:30
[dashboarddata]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/frontend/src/app/modules/providers/home/data.ts:95
[dashboardui]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/frontend/src/app/modules/providers/home/home.ts:33
[deploy]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/docs/operations/deploy.md:1
[detailsui]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/frontend/src/app/modules/orders/order-details/order-details.page.ts:20
[fdocker]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/frontend/Dockerfile:1
[fenv]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/frontend/src/environments/environment.ts:2
[finish]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/backend/src/modules/order/commands/finish-order/finish-order.handler.ts:16
[finishdto]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/backend/src/modules/order/dto/finish-order.dto.ts:13
[finishui]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/frontend/src/app/modules/orders/finish-service/finish-service.page.ts:19
[forgot]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/backend/src/modules/auth/commands/forgot-password/forgot-password.handle.ts:11
[fpkg]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/frontend/package.json:1
[froutes]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/frontend/src/app/app.routes.ts:22
[gateway]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/backend/src/modules/payments/pagarme.service.ts:23
[geo]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/frontend/src/app/shared/service/geolocalization/geolocalization.ts:10
[invitation]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/backend/src/modules/admin/users/invitations/admin-invitation-delivery.service.ts:12
[landing]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/landing-page/index.html:79
[lifecycle]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/backend/test/e2e/order-lifecycle.e2e-spec.ts:1
[login]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/backend/src/modules/auth/queries/login/login.handle.ts:13
[main]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/backend/src/main.ts:1
[map]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/frontend/src/app/shared/components/ui/proxi-map/proxi-map.component.ts:180
[orderhttp]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/frontend/src/app/shared/service/order/order.ts:41
[orderscontroller]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/backend/src/modules/order/order.controller.ts:43
[paymentcontroller]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/backend/src/modules/payments/payments.controller.ts:44
[payoutcontract]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/backend/src/modules/payments/pagarme-payout-capabilities.contract.ts:1
[payoutmigration]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/backend/src/prisma/migrations/20260724043000_add_provider_payout_profile_and_social/migration.sql:1
[prisma]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/backend/src/prisma/prisma.service.ts:5
[profilemapper]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/backend/src/modules/user/mappers/public-user-profile.mapper.ts:63
[providerget]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/backend/src/modules/provider/queries/get-provider/get-provider.handler.ts:7
[providerlist]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/backend/src/modules/provider/queries/list-providers/list-providers.handler.ts:10
[providerorders]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/backend/src/modules/order/queries/list-provider-orders/list-provider-orders.handler.ts:7
[readme]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/README.md:1
[registerdto]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/backend/src/modules/auth/dto/auth-register.dto.ts:3
[registerflow]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/frontend/src/app/modules/auth/services/register-user/register-user.ts:22
[registerhttp]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/frontend/src/app/shared/service/users/user-register.ts:32
[registerservices]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/frontend/src/app/modules/auth/register/services/services.ts:19
[registerspec]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/frontend/src/app/shared/service/users/user-register.spec.ts:1
[removeorder]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/backend/src/modules/order/commands/remove-order/remove-order.handler.ts:7
[review]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/backend/src/modules/order/commands/create-order-review/create-order-review.handler.ts:19
[rolesguard]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/backend/src/shared/guards/roles/roles.guard.ts:13
[root]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/package.json:1
[schedule]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/backend/src/modules/order/commands/schedule-order/schedule-order.handler.ts:8
[schema]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/backend/src/prisma/schema.prisma:1
[search]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/frontend/src/app/modules/customer/search/search.ts:322
[seeds]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/backend/src/prisma/seeds/seeds.ts:43
[servicescontroller]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/backend/src/modules/services/services.controller.ts:26
[servicevalidator]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/backend/src/modules/user/commands/create-user/validations/user-service.validator.ts:13
[summary]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/backend/src/modules/order/queries/get-order-summary/get-order-summary.handler.ts:8
[tokeninterceptor]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/frontend/src/app/shared/interceptors/token/token.interceptor.ts:11
[tracing]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/backend/src/tracing.ts:1
[updatedto]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/backend/src/modules/order/dto/update-order.dto.ts:4
[updateorder]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/backend/src/modules/order/commands/update-order/update-order.handler.ts:8
[updateservice]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/backend/src/modules/services/commands/update-service/update-service.handler.ts:6
[usercontroller]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/backend/src/modules/user/user.controller.ts:29
[userservice]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/backend/src/modules/user/user.service.ts:124
[verification]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/backend/src/modules/user/user-verification.service.ts:4
[webhook]: /Users/petersonfonsecasimiao/Developer/projects/TaskGo/apps/backend/src/modules/payments/commands/process-pagarme-webhook/process-pagarme-webhook.handler.ts:20
