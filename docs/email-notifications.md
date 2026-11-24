# E-mails transacionais

Os e-mails da Proxi saem pelo [Resend](https://resend.com/docs/introduction), pela API HTTP. O canal é escolhido uma vez no `EmailModule` (`apps/backend/src/modules/notification/email.module.ts`) e todos os fluxos usam o mesmo `EmailTransport`.

## Configuração

| Variável | Obrigatória | Uso |
| --- | --- | --- |
| `RESEND_API_KEY` | Sim, segredo | Chave com permissão "Sending access" criada no painel do Resend (começa com `re_`). |
| `MAIL_FROM` | Sim | Remetente num domínio verificado no Resend, ex.: `Proxi <nao-responda@seu-dominio>`. |
| `MAIL_REPLY_TO` | Não | Endereço que recebe as respostas dos usuários. |
| `SMTP_URL` | Não | Alternativa para testes locais (Mailpit/MailHog). Só é usado sem `RESEND_API_KEY`. |
| `FRONTEND_URL` / `NOTIFICATION_FRONTEND_URL` | Para links | Origem pública do app usada nos botões dos e-mails. HTTPS em produção. |
| `PASSWORD_RESET_FRONTEND_URL` | Para recuperação | Destino do link de redefinição de senha. |

Ordem de escolha: Resend (`RESEND_API_KEY` + `MAIL_FROM`), depois SMTP (`SMTP_URL` + `MAIL_FROM`), depois apenas log. Sem provedor, a recuperação de senha responde 503 e os demais e-mails só aparecem no log da API (com o corpo fora de produção, para testar códigos e links localmente).

Antes do primeiro envio real: verifique o domínio no Resend (registros SPF e DKIM no DNS) e use em `MAIL_FROM` um endereço desse domínio. Até lá, o Resend só aceita enviar para o e-mail da própria conta.

## Eventos cobertos

| Evento | Destinatário | Botão do e-mail |
| --- | --- | --- |
| Cadastro concluído (boas-vindas) | Novo usuário | Acessar a conta |
| Código de verificação de e-mail | Usuário | (código em destaque) |
| Recuperação de senha | Usuário | Criar nova senha (expira em 30 min) |
| Convite para o backoffice | Novo administrador | Ativar conta |
| Nova solicitação de serviço | Prestador | Aceitar ou recusar |
| Pedido aceito | Cliente | Pagar e garantir o horário |
| Pedido recusado ou cancelado pelo prestador | Cliente | Detalhes do pedido (avisa sobre estorno) |
| Pedido expirado (sem resposta ou sem pagamento) | Cliente e prestador | Buscar outro profissional / Meus pedidos |
| Pagamento confirmado: serviço agendado | Cliente | Acompanhar pedido |
| Pagamento confirmado: agendamento confirmado | Prestador | Ver o pedido |
| Prestador a caminho | Cliente | Acompanhar pedido |
| Serviço finalizado pelo prestador | Cliente | Confirmar conclusão |
| Cliente confirmou a conclusão | Prestador | Meus recebimentos |
| Cliente confirmou a conclusão (convite para avaliar) | Cliente | Avaliar |
| Nova avaliação recebida | Prestador | Ver o pedido |

Ainda não existem no produto, então não há e-mail: cancelamento pelo cliente e reagendamento (a rota de reagendamento está desativada).

## Formato e entrega

Cada e-mail é montado por `renderEmail` (`email-template.ts`) a partir de um conteúdo estruturado (saudação, parágrafos, botão, observação). O mesmo conteúdo gera a versão HTML, com o visual da marca e todo texto escapado, e a versão em texto puro. Os horários usam `America/Sao_Paulo`.

O transporte do Resend envia com uma `Idempotency-Key` estável por evento (ex.: `order-accepted/42`) e uma tag `category` para filtrar no painel. Falhas transitórias (timeout, rede, 429 e 5xx) são repetidas até 3 vezes com a mesma chave, então uma retentativa nunca duplica o e-mail. Erros de validação (4xx) não são repetidos.

Os avisos do pedido são disparados depois que a ação é persistida e uma falha de entrega nunca desfaz a operação: ela é registrada no log sem destinatário, conteúdo ou credenciais. O convite do backoffice é a exceção e propaga a falha, para o administrador saber que o convite não saiu. Não há fila persistente: se o Resend ficar indisponível por mais tempo que as retentativas, o e-mail se perde e o evento fica só no log.

## Testar localmente

Sem chave do Resend, rode um servidor de captura (ex.: Mailpit) e configure `SMTP_URL=smtp://localhost:1025`, um `MAIL_FROM` de teste e `FRONTEND_URL=http://localhost:4200`. Com uma chave de teste do Resend, envie para o e-mail da sua conta ou para os endereços de teste `delivered@resend.dev` e `bounced@resend.dev`. Os testes automatizados nunca enviam e-mail real.
