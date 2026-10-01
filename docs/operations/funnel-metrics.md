# Métricas do funil (backoffice)

Endpoint: `GET /admin/metrics/funnel?from=<ISO 8601>&to=<ISO 8601>`, protegido
por `AdminAuthGuard` + `AdminRolesGuard` com a capability
`funnel-metrics:read` (perfis Administrator e Finance). A página **Funil** do
backoffice (`/funnel`) consome esse endpoint.

## Período

- Padrão: as últimas 8 semanas ISO (segunda a domingo), incluindo a semana
  corrente, até o momento da consulta. Máximo de 26 semanas.
- `from` é alinhado ao início (segunda 00:00) da sua semana. As semanas são
  calculadas no fuso `America/Sao_Paulo` (UTC-3 fixo, sem horário de verão).

## Fontes dos dados

Não há analytics de eventos: tudo é derivado do banco, com agregação no
PostgreSQL (`admin-funnel-metrics.queries.ts`).

| Etapa                      | Fonte do timestamp                                                                                                                                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Criado                     | `pedidos.solicitado_em`                                                                                                                                                                                |
| Aceito                     | primeiro evento `ACCEPTED` em `historico_pedido` (gravado quando o prestador confirma o pedido)                                                                                                        |
| Pago (pagamento garantido) | `pagamentos.authorized_at`, senão `pago_em`, `captured_at` e, por fim, o primeiro evento `PAYMENT_AUTHORIZED`/`PAYMENT_CAPTURED` da timeline. Conta mesmo que depois tenha sido cancelado ou estornado |
| Concluído                  | `pedidos.client_confirmed_at`, senão `order_completions.confirmed_by_client_at` e `pedidos.provider_finished_at`; somente pedidos com status `CONCLUIDO`                                               |
| Cancelado / recusado       | primeiro evento `CANCELED` da timeline, senão `solicitado_em`; pedidos com status `CANCELADO` / `REJEITADO`                                                                                            |

Contagens semanais são por **data do evento** (um pedido criado em uma semana e
aceito na seguinte aparece em semanas diferentes).

## Definições

- **North Star — serviços concluídos e pagos por semana**: pedidos `CONCLUIDO`
  na semana cujo pagamento atual está em `PAGO`, `CAPTURED` ou `RELEASED`.
- **Prestadores prontos para vender** (snapshot atual): status `APPROVED`, ao
  menos um serviço `ATIVO` com `disponibilidade` preenchida e perfil de
  recebimento com `sync_status = READY` e `bank_account_status = CONFIRMED`
  (mesma regra que libera a criação de pagamento). As etapas do onboarding são
  cumulativas: cadastrados → aprovados → com oferta ativa com agenda → com
  recebimento pronto.
- **Aceite em até 2 h**: coorte por semana de criação. Denominador = pedidos
  criados há mais de 2 h (em relação ao fim do período ou ao momento atual);
  numerador = os que receberam `ACCEPTED` em até 2 h. A **mediana do tempo até
  aceite** usa os pedidos aceitos da mesma coorte.
- **Conversão aceite → pago**: coorte por semana de aceite; fração com
  pagamento garantido em qualquer momento. Semanas recentes ainda podem
  converter.
- **Recontratação em 60 dias**: coorte madura de clientes cujo primeiro serviço
  concluído caiu entre `to − 120 dias` e `to − 60 dias`; recontratou quem fez um
  novo pedido (qualquer status) em até 60 dias após a conclusão. Também é
  informada a taxa com o mesmo prestador.

## Limitações

- `pedidos.solicitado_em` e `historico_pedido.event/createdAt` não têm índices
  próprios; as consultas fazem varredura dessas tabelas. Suficiente para o
  volume atual; se crescer, criar índices em `pedidos(solicitado_em)` e
  `historico_pedido(event, "createdAt")`.
- Pedidos antigos sem evento `ACCEPTED` na timeline não contam como aceitos.
