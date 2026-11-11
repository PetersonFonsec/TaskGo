# Push e sessão do app mobile

Base do backend para o app do cliente (Ionic + Capacitor) e para o web push do
prestador. Ver o brief do app para o contexto de produto.

## Push

- `POST /devices` com `{ "token": "<token FCM>", "platform": "ANDROID" | "IOS" | "WEB" }`
  registra o aparelho do usuário autenticado. Um token pertence a um aparelho só:
  se outra conta entrar no mesmo aparelho, o token muda de dono.
- O aparelho fica ligado à sessão do app que o registrou (a família do refresh
  token, levada no access token como `sid`). `POST /auth/logout` revoga essa sessão
  e apaga os aparelhos dela na mesma transação; as outras sessões e aparelhos da
  conta continuam ativos. Se outra conta registrar o mesmo token, ele passa para a
  nova conta e sessão.
- `DELETE /devices/:token` remove o aparelho. Uma sessão só remove aparelhos dela
  ou registrados sem sessão (como os do site); nunca os de outra sessão.
- Registros sem sessão (feitos pelo site ou antes desta mudança) não são apagados
  pelo logout do app; continuam removíveis por `DELETE /devices/:token` e pela
  limpeza automática de tokens inválidos.
- O token só é apagado quando o FCM prova que ele não serve mais: `UNREGISTERED`,
  `SENDER_ID_MISMATCH` ou `INVALID_ARGUMENT` com violação no campo `message.token`.
  `INVALID_ARGUMENT` sem isso (erro de payload), falhas temporárias, 401/403 e
  respostas malformadas preservam o token e ficam no log, sem o token completo.
- Cada aparelho é enviado de forma isolada: timeout ou erro num deles não impede
  a entrega nem a limpeza dos outros. Falha ao autenticar no OAuth cancela o envio
  daquele aviso e fica no log, sem afetar o pedido.
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
- A rotação roda numa transação com bloqueio da linha do token (`FOR UPDATE`):
  consumir o token antigo e gravar o sucessor acontecem juntos, e só uma
  renovação concorrente vence, mesmo com várias instâncias da API.
- Política de reuso: se um token já usado reaparece em até 10 segundos do uso
  (relógio do banco), a requisição recebe 401, mas a sessão não é revogada. Isso
  cobre duas renovações disparadas juntas pelo mesmo app; ele deve seguir com o
  token da resposta que deu certo. Depois dessa janela, o reuso revoga a sessão
  inteira e solta os aparelhos dela.
- Limitação: uma segunda apresentação isolada do mesmo token não permite saber
  se é corrida legítima ou roubo. Dentro da janela, quem reapresenta não recebe
  token novo (nenhum token antigo gera dois sucessores), mas a sessão também não
  é derrubada.
- Troca ou redefinição de senha invalida os refresh tokens emitidos antes dela.
- Só o hash SHA-256 do token fica no banco. Validade: `REFRESH_TOKEN_TTL_DAYS` (60 dias).
- O site continua usando apenas o `access_token`; nada muda para ele.

## Canal do pedido

`POST /orders` aceita `channel: "APP"`. Sem o campo, o pedido é `WEB`. O campo
`pedidos.canal` permite separar app e site no funil.
