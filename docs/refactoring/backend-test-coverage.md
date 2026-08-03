# Backend critical-flow coverage

Matriz da Entrega 1 para orientar testes de caracterização antes das próximas refatorações.

| Fluxo                                        | Cobertura existente                                             | Situação                 | Próxima ação                                                                   |
| -------------------------------------------- | --------------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------ |
| Login e registro de usuário                  | `auth.e2e-spec.ts`, specs de auth e criação de usuário          | Coberto                  | Preservar contrato durante centralização de configuração.                      |
| Separação entre token comum e administrativo | `auth.e2e-spec.ts`, guards administrativos                      | Coberto                  | Manter ao consolidar infraestrutura JWT.                                       |
| Cadastro completo de cliente e prestador     | `customer-booking-flow.e2e-spec.ts`                             | Coberto em cenário feliz | Adicionar falha transacional do onboarding antes de corrigir sua fronteira.    |
| Ownership de endereços                       | `address-ownership.e2e-spec.ts` e spec do controller            | Coberto                  | Preservar identidade derivada do token.                                        |
| Descoberta e disponibilidade de prestadores  | `customer-booking-flow.e2e-spec.ts`, `provider.service.spec.ts` | Coberto                  | Adicionar concorrência de reserva quando a disponibilidade for extraída.       |
| Criação e agendamento de pedido              | `customer-booking-flow.e2e-spec.ts`, specs de order             | Parcial                  | Caracterizar rollback e conflitos simultâneos antes da refatoração de pedidos. |
| Ciclo completo do pedido                     | `order-lifecycle.e2e-spec.ts`, handlers de conclusão e review   | Coberto                  | Preservar transições e códigos HTTP.                                           |
| Delegação HTTP do pedido                     | `order.controller.spec.ts`                                      | Coberto nesta entrega    | Usar como proteção ao migrar métodos para commands/queries.                    |
| Pagamento PIX e cartão                       | `payments.e2e-spec.ts`, `payment.service.spec.ts`               | Coberto                  | Preservar split, ownership e estados.                                          |
| Webhook e idempotência                       | `payment-webhook.e2e-spec.ts`, specs de payment                 | Coberto                  | Adicionar validação de assinatura quando o adapter for refatorado.             |
| Administração de usuários                    | `admin-users.e2e-spec.ts` e specs unitários                     | Coberto                  | Separar casos de uso mantendo auditoria atômica.                               |
| Administração de prestadores                 | `admin-providers.e2e-spec.ts` e specs unitários                 | Coberto                  | Dividir service sem alterar projeções públicas.                                |
| Auditoria administrativa                     | `admin-audit-logs.e2e-spec.ts` e specs de integração            | Coberto                  | Preservar append-only, sanitização e rollback conjunto.                        |
| Configuração de ambiente no boot             | Testes focados de CORS                                          | Lacuna                   | Criar quando `ConfigModule` e schema de ambiente forem introduzidos.           |
| Paginação genérica                           | Testes indiretos por módulos                                    | Lacuna                   | Caracterizar limites, ordenação e página vazia antes de substituí-la.          |

## Testes obrigatórios antes das respectivas mudanças

1. Onboarding: provar rollback de usuário, endereço, prestador e associações quando uma etapa falha.
2. Paginação: registrar comportamento atual para página, limite, ordenação e busca.
3. Pedidos concorrentes: duas tentativas para o mesmo slot não podem produzir duas reservas válidas.
4. Configuração: aplicação deve falhar no boot quando segredo obrigatório estiver ausente em produção.
5. Webhook: assinatura inválida não pode causar persistência nem transição de estado.
