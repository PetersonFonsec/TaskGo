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
- Sair chama `POST /auth/logout`, que encerra a sessão e solta os aparelhos dela.

## Push

- Depois do login o app pede a permissão de notificação e envia o token para
  `POST /devices`. Ao abrir o app, o token é reenviado só se a permissão já foi
  dada (sem perguntar de novo).
- Por enquanto, tocar num aviso abre a tela inicial. A tela do pedido usará o
  `data.orderId` que o backend já manda (ver `docs/mobile-push.md`).

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
