import { OrderCancellationReason } from '@prisma/client';

export const CANCELLATION_REASON_LABELS: Record<
  OrderCancellationReason,
  string
> = {
  NO_AVAILABILITY: 'Sem horário disponível',
  OUT_OF_AREA: 'Fora da área de atendimento',
  SERVICE_NOT_OFFERED: 'Prestador não realiza este serviço',
  OTHER: 'Outro motivo',
};

export function cancellationDescription(
  reason: OrderCancellationReason,
  note?: string | null,
) {
  const label = CANCELLATION_REASON_LABELS[reason];
  return note ? `${label}: ${note}` : label;
}
