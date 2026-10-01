import { Prisma } from '@prisma/client';

/**
 * Consultas SQL agregadas do funil (PostgreSQL).
 *
 * Fontes dos timestamps (todas as colunas são TIMESTAMP(3) em UTC):
 * - criado: `pedidos.solicitado_em`;
 * - aceito: primeiro evento `ACCEPTED` em `historico_pedido` (gravado quando o
 *   prestador confirma o pedido);
 * - pago (pagamento garantido): `pagamentos.authorized_at`, depois `pago_em`,
 *   `captured_at` e, por fim, o primeiro evento `PAYMENT_AUTHORIZED` ou
 *   `PAYMENT_CAPTURED` da timeline. Conta o pagamento mesmo que ele tenha sido
 *   cancelado ou estornado depois;
 * - concluído: `pedidos.client_confirmed_at`, depois
 *   `order_completions.confirmed_by_client_at` e `pedidos.provider_finished_at`,
 *   somente para pedidos com status `CONCLUIDO`;
 * - cancelado/recusado: primeiro evento `CANCELED` da timeline ou, na ausência
 *   dele, `pedidos.solicitado_em`, para pedidos com status `CANCELADO` ou
 *   `REJEITADO`.
 *
 * As semanas são semanas ISO (segunda a domingo) no fuso America/Sao_Paulo.
 */
export const FUNNEL_TIMEZONE = 'America/Sao_Paulo';

export interface FunnelWeeklyRow {
  week_start: string | null;
  iso_week: string | null;
  created: number;
  acceptance_eligible: number;
  accepted_within_2h: number;
  accepted_in_cohort: number;
  median_accept_seconds: number | null;
  accepted: number;
  accepted_then_paid: number;
  paid: number;
  completed: number;
  completed_paid: number;
  canceled: number;
  rejected: number;
}

export interface FunnelRehireRow {
  clients: number;
  rehired: number;
  rehired_same_provider: number;
}

export interface FunnelWeeklyParams {
  from: Date;
  to: Date;
  acceptanceCutoff: Date;
}

/**
 * Uma linha por semana do intervalo, mais uma linha de totais
 * (`week_start` nulo) gerada por GROUPING SETS para a mediana do período.
 */
export function funnelWeeklySql({
  from,
  to,
  acceptanceCutoff,
}: FunnelWeeklyParams): Prisma.Sql {
  const fromIso = from.toISOString();
  const toIso = to.toISOString();
  const cutoffIso = acceptanceCutoff.toISOString();

  return Prisma.sql`
    WITH bounds AS (
      SELECT
        (${fromIso}::timestamptz AT TIME ZONE 'UTC') AS from_utc,
        (${toIso}::timestamptz AT TIME ZONE 'UTC') AS to_utc,
        (${cutoffIso}::timestamptz AT TIME ZONE 'UTC') AS cutoff_utc
    ),
    weeks AS (
      SELECT generate_series(
        date_trunc('week', ${fromIso}::timestamptz AT TIME ZONE ${FUNNEL_TIMEZONE}),
        date_trunc('week', ${toIso}::timestamptz AT TIME ZONE ${FUNNEL_TIMEZONE}),
        interval '1 week'
      ) AS week_start
    ),
    first_events AS (
      SELECT
        t.pedido_id AS order_id,
        MIN(t."createdAt") FILTER (WHERE t.event = 'ACCEPTED') AS accepted_at,
        MIN(t."createdAt") FILTER (WHERE t.event = 'CANCELED') AS canceled_at,
        MIN(t."createdAt") FILTER (
          WHERE t.event IN ('PAYMENT_AUTHORIZED', 'PAYMENT_CAPTURED')
        ) AS payment_event_at
      FROM historico_pedido t, bounds b
      WHERE t.event IN (
          'ACCEPTED', 'CANCELED', 'PAYMENT_AUTHORIZED', 'PAYMENT_CAPTURED'
        )
        AND t."createdAt" >= b.from_utc
      GROUP BY t.pedido_id
    ),
    funnel_orders AS (
      SELECT
        o.id,
        o.status,
        o.solicitado_em AS requested_at,
        fe.accepted_at,
        COALESCE(fe.canceled_at, o.solicitado_em) AS canceled_at,
        COALESCE(
          p.authorized_at, p.pago_em, p.captured_at, fe.payment_event_at
        ) AS paid_at,
        p.status AS payment_status,
        COALESCE(
          o.client_confirmed_at,
          oc.confirmed_by_client_at,
          o.provider_finished_at
        ) AS completed_at
      FROM pedidos o
      CROSS JOIN bounds b
      LEFT JOIN first_events fe ON fe.order_id = o.id
      LEFT JOIN pagamentos p ON p.pedido_id = o.id
      LEFT JOIN order_completions oc ON oc.order_id = o.id
      WHERE o.solicitado_em <= b.to_utc
    ),
    local_orders AS (
      SELECT
        fo.*,
        date_trunc('week', (fo.requested_at AT TIME ZONE 'UTC') AT TIME ZONE ${FUNNEL_TIMEZONE}) AS requested_week,
        date_trunc('week', (fo.accepted_at AT TIME ZONE 'UTC') AT TIME ZONE ${FUNNEL_TIMEZONE}) AS accepted_week,
        date_trunc('week', (fo.paid_at AT TIME ZONE 'UTC') AT TIME ZONE ${FUNNEL_TIMEZONE}) AS paid_week,
        date_trunc('week', (fo.completed_at AT TIME ZONE 'UTC') AT TIME ZONE ${FUNNEL_TIMEZONE}) AS completed_week,
        date_trunc('week', (fo.canceled_at AT TIME ZONE 'UTC') AT TIME ZONE ${FUNNEL_TIMEZONE}) AS canceled_week
      FROM funnel_orders fo
    ),
    created_stats AS (
      SELECT
        lo.requested_week AS week_start,
        COUNT(*)::int AS created,
        COUNT(*) FILTER (WHERE lo.requested_at <= b.cutoff_utc)::int
          AS acceptance_eligible,
        COUNT(*) FILTER (
          WHERE lo.requested_at <= b.cutoff_utc
            AND lo.accepted_at <= lo.requested_at + interval '2 hours'
        )::int AS accepted_within_2h,
        COUNT(lo.accepted_at)::int AS accepted_in_cohort,
        percentile_cont(0.5) WITHIN GROUP (
          ORDER BY EXTRACT(EPOCH FROM lo.accepted_at - lo.requested_at)
        ) FILTER (WHERE lo.accepted_at IS NOT NULL) AS median_accept_seconds
      FROM local_orders lo
      CROSS JOIN bounds b
      WHERE lo.requested_at >= b.from_utc AND lo.requested_at <= b.to_utc
      GROUP BY GROUPING SETS ((lo.requested_week), ())
    ),
    accepted_stats AS (
      SELECT
        lo.accepted_week AS week_start,
        COUNT(*)::int AS accepted,
        COUNT(lo.paid_at)::int AS accepted_then_paid
      FROM local_orders lo
      CROSS JOIN bounds b
      WHERE lo.accepted_at >= b.from_utc AND lo.accepted_at <= b.to_utc
      GROUP BY lo.accepted_week
    ),
    paid_stats AS (
      SELECT lo.paid_week AS week_start, COUNT(*)::int AS paid
      FROM local_orders lo
      CROSS JOIN bounds b
      WHERE lo.paid_at >= b.from_utc AND lo.paid_at <= b.to_utc
      GROUP BY lo.paid_week
    ),
    completed_stats AS (
      SELECT
        lo.completed_week AS week_start,
        COUNT(*)::int AS completed,
        COUNT(*) FILTER (
          WHERE lo.payment_status IN ('PAGO', 'CAPTURED', 'RELEASED')
        )::int AS completed_paid
      FROM local_orders lo
      CROSS JOIN bounds b
      WHERE lo.status = 'CONCLUIDO'
        AND lo.completed_at >= b.from_utc
        AND lo.completed_at <= b.to_utc
      GROUP BY lo.completed_week
    ),
    canceled_stats AS (
      SELECT
        lo.canceled_week AS week_start,
        COUNT(*) FILTER (WHERE lo.status = 'CANCELADO')::int AS canceled,
        COUNT(*) FILTER (WHERE lo.status = 'REJEITADO')::int AS rejected
      FROM local_orders lo
      CROSS JOIN bounds b
      WHERE lo.status IN ('CANCELADO', 'REJEITADO')
        AND lo.canceled_at >= b.from_utc
        AND lo.canceled_at <= b.to_utc
      GROUP BY lo.canceled_week
    )
    SELECT
      to_char(w.week_start, 'YYYY-MM-DD') AS week_start,
      to_char(w.week_start, 'IYYY-"W"IW') AS iso_week,
      COALESCE(cs.created, 0) AS created,
      COALESCE(cs.acceptance_eligible, 0) AS acceptance_eligible,
      COALESCE(cs.accepted_within_2h, 0) AS accepted_within_2h,
      COALESCE(cs.accepted_in_cohort, 0) AS accepted_in_cohort,
      cs.median_accept_seconds::float8 AS median_accept_seconds,
      COALESCE(a.accepted, 0) AS accepted,
      COALESCE(a.accepted_then_paid, 0) AS accepted_then_paid,
      COALESCE(p.paid, 0) AS paid,
      COALESCE(c.completed, 0) AS completed,
      COALESCE(c.completed_paid, 0) AS completed_paid,
      COALESCE(x.canceled, 0) AS canceled,
      COALESCE(x.rejected, 0) AS rejected
    FROM weeks w
    LEFT JOIN created_stats cs ON cs.week_start = w.week_start
    LEFT JOIN accepted_stats a ON a.week_start = w.week_start
    LEFT JOIN paid_stats p ON p.week_start = w.week_start
    LEFT JOIN completed_stats c ON c.week_start = w.week_start
    LEFT JOIN canceled_stats x ON x.week_start = w.week_start
    UNION ALL
    SELECT
      NULL, NULL,
      COALESCE(MAX(cs.created), 0),
      COALESCE(MAX(cs.acceptance_eligible), 0),
      COALESCE(MAX(cs.accepted_within_2h), 0),
      COALESCE(MAX(cs.accepted_in_cohort), 0),
      MAX(cs.median_accept_seconds)::float8,
      0, 0, 0, 0, 0, 0, 0
    FROM created_stats cs
    WHERE cs.week_start IS NULL
    ORDER BY 1 NULLS LAST
  `;
}

/**
 * Coorte madura de recontratação: clientes cujo primeiro serviço concluído
 * dentro de [cohortFrom, cohortTo] já completou a janela de 60 dias.
 * "Recontratou" = fez um novo pedido (qualquer status) em até 60 dias após a
 * conclusão; a variante "mesmo prestador" exige o mesmo prestador.
 */
export function funnelRehireSql(cohortFrom: Date, cohortTo: Date): Prisma.Sql {
  return Prisma.sql`
    WITH cohort AS (
      SELECT DISTINCT ON (o.cliente_id)
        o.id,
        o.cliente_id AS client_id,
        s.prestador_id AS provider_id,
        COALESCE(o.client_confirmed_at, o.provider_finished_at) AS completed_at
      FROM pedidos o
      JOIN servicos s ON s.id = o.servico_id
      WHERE o.status = 'CONCLUIDO'
        AND COALESCE(o.client_confirmed_at, o.provider_finished_at)
          >= (${cohortFrom.toISOString()}::timestamptz AT TIME ZONE 'UTC')
        AND COALESCE(o.client_confirmed_at, o.provider_finished_at)
          <= (${cohortTo.toISOString()}::timestamptz AT TIME ZONE 'UTC')
      ORDER BY
        o.cliente_id,
        COALESCE(o.client_confirmed_at, o.provider_finished_at),
        o.id
    )
    SELECT
      COUNT(*)::int AS clients,
      COUNT(*) FILTER (
        WHERE EXISTS (
          SELECT 1
          FROM pedidos n
          WHERE n.cliente_id = c.client_id
            AND n.id <> c.id
            AND n.solicitado_em > c.completed_at
            AND n.solicitado_em <= c.completed_at + interval '60 days'
        )
      )::int AS rehired,
      COUNT(*) FILTER (
        WHERE EXISTS (
          SELECT 1
          FROM pedidos n
          JOIN servicos ns ON ns.id = n.servico_id
          WHERE n.cliente_id = c.client_id
            AND n.id <> c.id
            AND ns.prestador_id = c.provider_id
            AND n.solicitado_em > c.completed_at
            AND n.solicitado_em <= c.completed_at + interval '60 days'
        )
      )::int AS rehired_same_provider
    FROM cohort c
  `;
}
