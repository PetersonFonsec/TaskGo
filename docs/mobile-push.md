# Push e sessão do app mobile

Base do backend para o app do cliente (Ionic + Capacitor) e para o web push do
prestador. Ver o brief do app para o contexto de produto.

## Push

- `POST /devices` com `{ "token": "<token FCM>", "platform": "ANDROID" | "IOS" | "WEB" }`
  registra o aparelho do usuário autenticado. Um token pertence a um aparelho só:
  se outra conta entrar no mesmo aparelho, o token muda de dono.
- `DELETE /devices/:token` remove o aparelho (chamar no logout do app).
- Os avisos saem pelo `NotificationService` nos mesmos pontos dos e-mails do ciclo
  do pedido, depois do commit. O push complementa o e-mail e nunca desfaz nem
  atrasa a operação. Tokens que o FCM declara desinstalados são apagados.
- Cada push leva `data.type` e `data.orderId` para o app abrir o pedido certo.

| `data.type`                        | Destinatário |
| ---------------------------------- | ------------ |
| `ORDER_REQUESTED`                  | Prestador    |
| `ORDER_ACCEPTED`                   | Cliente      |
| `ORDER_REFUSED` / `ORDER_CANCELED` | Cliente      |
| `PAYMENT_CONFIRMED`                | Cliente      |
| `PROVIDER_ON_THE_WAY`              | Cliente      |
| `SERVICE_FINISHED`                 | Cliente      |
| `COMPLETION_CONFIRMED`             | Prestador    |
| `REVIEW_RECEIVED`                  | Prestador    |
| `ORDER_EXPIRED`                    | Ambos        |

### Configuração

1. Crie um projeto gratuito no [Firebase](https://console.firebase.google.com).
2. Em Configurações do projeto > Contas de serviço, gere uma chave privada (JSON).
3. Coloque o JSON (puro ou em base64) em `FCM_SERVICE_ACCOUNT` no ambiente da API.

Sem `FCM_SERVICE_ACCOUNT`, os avisos são apenas registrados no log, como os e-mails
sem SMTP. O envio usa a API HTTP v1 do FCM diretamente, sem o SDK `firebase-admin`.

## Sessão longa (refresh token)

- Login e cadastro devolvem `refresh_token` além do `access_token`.
- `POST /auth/refresh` com `{ "refresh_token": "..." }` devolve um novo par. O token
  usado deixa de valer (rotação); se um token já usado reaparecer, todos os tokens
  daquela sessão são revogados.
- `POST /auth/logout` com `{ "refresh_token": "..." }` encerra a sessão do aparelho.
- Troca ou redefinição de senha invalida os refresh tokens emitidos antes dela.
- Só o hash SHA-256 do token fica no banco. Validade: `REFRESH_TOKEN_TTL_DAYS` (60 dias).
- O site continua usando apenas o `access_token`; nada muda para ele.

## Canal do pedido

`POST /orders` aceita `channel: "APP"`. Sem o campo, o pedido é `WEB`. O campo
`pedidos.canal` permite separar app e site no funil.
