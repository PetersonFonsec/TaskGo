# App mobile do cliente (`apps/mobile`)

Ionic 9 + Capacitor 8 + Angular 21, no mesmo monorepo Nx. Reaproveita os tipos de
`libs/shared` e fala com a mesma API do site. O app é do cliente: contas de
prestador recebem uma mensagem e continuam pelo site.

## Rodar

```bash
npm ci                     # na raiz
npm run backend            # API em http://localhost:3000
npm run mobile             # app no navegador em http://localhost:8100
npm run mobile:test        # testes (Karma + ChromeHeadless)
npm run mobile:build       # build web em apps/mobile/dist/browser
```

No navegador o push não existe e a sessão fica no `localStorage`; serve para
desenvolver as telas. Para o aparelho:

```bash
cd apps/mobile
npm run cap:android        # build, sync e abre o Android Studio
npm run cap:ios            # build, sync e abre o Xcode (só no Mac)
```

Para o emulador Android falar com a API local em HTTP, troque `apiUrl` em
`src/environments/environment.development.ts` para `http://10.0.2.2:3000`, gere o
build com `npx ng build --configuration development` e sincronize com
`TASKGO_DEV_HTTP=1 npx cap sync android`. Builds das lojas usam a API em HTTPS e
não ligam essa opção.

## Antes de publicar

- `src/environments/environment.ts`: trocar `apiUrl` pela URL HTTPS da API na VPS.
- API em produção: incluir as origens do app em `PUBLIC_FRONTEND_ORIGINS`:
  `https://localhost` (Android) e `capacitor://localhost` (iOS).
- `appId` é `com.taskgo.app` (`capacitor.config.ts`). Ele não muda depois da
  primeira publicação na loja; troque agora se preferir outro (por exemplo, o
  domínio do TaskGo ao contrário).

## Sessão

- Login em `POST /auth/login`. O refresh token vai para o Keychain (iOS) ou
  Keystore (Android) via `@aparajita/capacitor-secure-storage`; o access token
  fica só em memória.
- Ao abrir o app, a sessão salva é carregada e o primeiro pedido à API renova o
  par em `POST /auth/refresh`.
- Um 401 dispara uma única renovação, mesmo com várias requisições falhando
  juntas, e cada uma é repetida uma vez com o token novo. O app sempre grava e
  usa o refresh token mais novo, porque a API rotaciona e recusa reuso.
- Se a API recusar o refresh token, a sessão local é apagada. Falta de rede não
  apaga a sessão.
- Cada login, logout ou restauração cria uma nova geração de sessão. Operações que
  terminam atrasadas (leitura do armazenamento, renovação, revogação) só alteram o
  estado se a geração em que começaram ainda for a atual, e uma requisição nunca
  é repetida com as credenciais de outra conta.
- O armazenamento seguro passa por uma fila: o que fica gravado segue a ordem em
  que o app pediu, mesmo que o Keychain/Keystore responda fora de ordem.

### Sair

- A sessão fica inutilizável no app na hora. O app marca a sessão como encerrada
  no armazenamento seguro (revogação pendente), apaga a sessão salva e espera a
  resposta de `POST /auth/logout`, usando o token mais novo se havia renovação em
  curso.
- 204: revogada; a pendência sai. 400: a API recusa o token em definitivo; a
  pendência também sai. Sem rede, 429 ou 5xx: a pendência fica (só o id local e o
  refresh token, no Keychain/Keystore) e é reenviada na abertura do app, quando a
  rede volta, quando o app volta para a frente e depois de um novo login.
- Uma sessão marcada como encerrada nunca é restaurada, mesmo que apagar o
  registro dela tenha falhado. Cada pendência é removida só pela própria sessão.
- `logout()` devolve os três estados, que podem divergir:
  `{ remote, retry, pendingPersisted, localCleared }`. `remote` é `revoked`,
  `unconfirmed`, `rejected` ou `none`; `retry` é `durable` (pendência gravada),
  `memory` (só neste processo) ou `none`.
- Limitação: se o armazenamento seguro e a API falharem juntos, a revogação fica
  só em memória (`retry: 'memory'`). Ela é reenviada enquanto o app estiver aberto
  e passa para o armazenamento se ele voltar a funcionar, mas se perde se o app
  for encerrado antes. Nesse caso a sessão pode continuar ativa no servidor até
  expirar (`REFRESH_TOKEN_TTL_DAYS`) ou até a senha mudar. A sessão local continua
  inutilizável, e se a sessão salva também não puder ser apagada o app não tem
  como impedir a restauração depois de um reinício; `localCleared: false` sinaliza
  esse caso. Não há outro armazenamento seguro como reserva: o `localStorage` não
  é usado para refresh tokens em produção.
- Os listeners de reconexão (`online` e `resume`) são removidos quando o
  componente raiz é destruído, inclusive se o registro nativo terminar depois.

## Pedido

Telas: perfil do prestador (`/prestadores/:id`), meus pedidos (`/pedidos`) e
detalhe com acompanhamento (`/pedidos/:id`). As duas últimas exigem login; sem
sessão o app vai para `/entrar?voltar=...` e volta depois.

- O perfil e os horários são públicos. Para pedir, o cliente escolhe serviço,
  dia, horário (agenda de 14 dias de `GET /provider/:id/availability`) e um
  endereço salvo com localização. O pedido vai para `POST /orders` com
  `channel: 'APP'`; o preço e a reserva do horário são decididos pela API.
- Pedido sem resposta (rede caiu, 5xx): `POST /orders` não tem chave de
  idempotência, então o app não reenvia sozinho. A tentativa fica gravada no
  armazenamento seguro, por conta, e bloqueia novos pedidos até se resolver. O
  app procura em `GET /orders` um pedido do mesmo serviço e horário feito depois
  do envio; se não achar, o cliente pode verificar de novo ou reenviar o mesmo
  pedido. O reenvio é seguro porque o backend serializa as reservas do prestador
  e recusa horário ocupado: se o primeiro existir, a API recusa e a busca o
  encontra. Só uma recusa da API sem pedido na lista libera outro horário
  (`OrderSubmission`).
- Dados da conta (pedidos, detalhe, endereços) ficam presos à sessão em que foram
  buscados (`privateResource` + `AuthService.session`): logout, troca de conta ou
  perda da sessão escondem tudo na hora e cancelam buscas antigas, inclusive em
  páginas que o Ionic mantém na pilha.
- A agenda pede os 14 dias a partir de hoje em São Paulo, qualquer que seja o
  fuso do aparelho.
- Endereços sem latitude e longitude não aparecem, porque a API recusaria o
  pedido. O app ainda não cadastra endereços: o cliente cadastra no site.
- Pagamento, confirmação de conclusão e avaliação ainda são feitos no site. A tela
  do pedido diz isso no passo em que o cliente precisa agir.
- Tocar numa notificação de pedido (`data.orderId`) abre `/pedidos/:orderId`; as
  demais abrem o início.
- `GET /provider/:id` devolve campos Decimal no formato interno do decimal.js
  (`{ s, e, d }`); `decimal()` em `orders.service.ts` converte para número.

## Push

- Depois do login o app pede a permissão de notificação e envia o token para
  `POST /devices`. Ao abrir o app, o token é reenviado só se a permissão já foi
  dada (sem perguntar de novo).
- O registro vale para uma sessão: o mesmo token não é reenviado na mesma sessão,
  e um novo login registra de novo. Token que chega sem sessão (antes do login ou
  depois do logout) não é enviado. Se a conta muda durante o envio, o token é
  registrado para a sessão nova.
- Falha de rede, 429 ou 5xx deixa o registro pendente, reenviado quando a rede ou o
  app voltam (sem timers). 401 passa pela renovação única do interceptor. Outras
  recusas marcam falha definitiva até um novo login ou token.
- No iOS, um token APNs cru (64 hex) não é enviado: a API espera token FCM (ver
  "Push no iOS").
- Tocar num aviso com `data.orderId` abre a tela do pedido; os demais abrem o
  início (ver `docs/mobile-push.md`).

### Push no Android

1. No projeto do Firebase, adicione um app Android com o pacote `com.taskgo.app`.
2. Baixe o `google-services.json` para `apps/mobile/android/app/` (fica fora do git).
3. Rode `npm run cap:android` e teste num aparelho ou emulador com Google Play.

### Push no iOS

A API envia pelo FCM, mas o plugin do Capacitor entrega o token APNs no iOS. Antes
de publicar no iOS:

1. No Xcode, ative as capabilities Push Notifications e Background Modes > Remote
   notifications, e envie a chave APNs (.p8) para o Firebase.
2. Adicione o pacote `firebase-ios-sdk` (produto `FirebaseMessaging`) pelo Xcode e
   o `GoogleService-Info.plist` em `ios/App/App/` (fica fora do git).
3. Em `AppDelegate.swift`, chame `FirebaseApp.configure()` no início e troque o
   repasse do token por:

```swift
Messaging.messaging().apnsToken = deviceToken
Messaging.messaging().token { token, error in
    if let error = error {
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
    } else if let token = token {
        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: token)
    }
}
```

O plugin aceita o token em texto e o entrega ao app, que o envia para a API.
