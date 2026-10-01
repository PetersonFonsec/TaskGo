# Emails transacionais

Configure o backend com `SMTP_URL`, `MAIL_FROM` e `NOTIFICATION_FRONTEND_URL` (origem pública do frontend, por exemplo `https://app.exemplo.com`). Em produção, os links exigem HTTPS. O remetente deve ser autorizado pelo provedor SMTP. A recuperação de senha continua usando `PASSWORD_RESET_FRONTEND_URL`.

| Ação concluída                   | Destinatário          | Destino do link                  |
| -------------------------------- | --------------------- | -------------------------------- |
| Cadastro de cliente ou prestador | Novo usuário          | Acesso à plataforma              |
| Solicitação de agendamento       | Prestador responsável | Detalhes do pedido               |
| Aceite do prestador              | Cliente do pedido     | Detalhes e pagamento             |
| Prestador informa a finalização  | Cliente do pedido     | Confirmação da conclusão         |
| Cliente confirma a conclusão     | Cliente do pedido     | Avaliação do serviço e prestador |

A avaliação exige pedido `CONCLUIDO`. Por isso, a finalização envia primeiro o convite para confirmar e avaliar, e a confirmação envia o link direto de avaliação. Os links exigem login e as permissões existentes do pedido; o login preserva o destino dos links de pedidos.

Os disparos ocorrem após a persistência da ação. Transações rejeitadas e transições repetidas não disparam mensagens. Os emails são texto em português; o horário usa `America/Sao_Paulo`. A mensagem de boas-vindas é tratada pelo evento `UserCreatedEvent`.

Falhas de configuração ou entrega são registradas como `Notification email delivery failed (<tipo>)`, sem destinatários, credenciais ou conteúdo. Não desfazem a operação de negócio. Esta implementação faz uma tentativa SMTP, sem fila persistente nem reenvio automático; portanto indisponibilidades do SMTP exigem acompanhamento operacional. A aceitação pelo SMTP não garante entrega na caixa de entrada.

Para validar localmente, use um servidor SMTP de captura e configure `SMTP_URL=smtp://localhost:1025`, um `MAIL_FROM` de teste e `NOTIFICATION_FRONTEND_URL=http://localhost:4200`. Cadastre cliente e prestador, solicite um agendamento, aceite, siga o fluxo de pagamento e finalização e confirme a conclusão. Confira destinatários e links em cada etapa. Nenhum email real é enviado pelos testes automatizados.
