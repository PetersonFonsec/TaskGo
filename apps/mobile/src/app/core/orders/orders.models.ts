import type { PublicProvider } from '@app/core/catalog/catalog.models';

/** GET /provider/:id: perfil público com as avaliações mais recentes. */
export interface ProviderProfile extends PublicProvider {
  readonly createdAt?: string;
  readonly reviews?: readonly ProviderReview[];
}

export interface ProviderReview {
  readonly id: string;
  readonly rating: number;
  readonly comment?: string | null;
  readonly reviewedAt: string;
}

export interface AvailabilitySlot {
  readonly startsAt: string;
  readonly endsAt: string;
  readonly serviceId: string;
  readonly label: string;
  readonly available: boolean;
}

export interface AvailabilityDay {
  readonly date: string;
  readonly available: boolean;
  readonly slots: readonly AvailabilitySlot[];
}

export interface Availability {
  readonly providerId: string;
  readonly timezone: string;
  readonly days: readonly AvailabilityDay[];
}

export interface SavedAddress {
  readonly id: string;
  readonly label?: string | null;
  readonly street?: string | null;
  readonly number?: string | null;
  readonly neighborhood?: string | null;
  readonly city?: string | null;
  readonly state?: string | null;
  readonly cep?: string | null;
  readonly lat?: number | null;
  readonly lng?: number | null;
  readonly isDefault?: boolean;
  readonly active?: boolean;
}

export type OrderStatus =
  | 'AGUARDANDO_APROVACAO'
  | 'REJEITADO'
  | 'AGUARDANDO_PAGAMENTO'
  | 'AGENDADO'
  | 'EM_DESLOCAMENTO'
  | 'EM_ANDAMENTO'
  | 'AGUARDANDO_CONFIRMACAO_CLIENTE'
  | 'CONCLUIDO'
  | 'CANCELADO'
  | 'DISPUTA';

export interface NewOrder {
  readonly serviceId: string;
  readonly scheduledFor: string;
  readonly addressId: string;
}

/** Item de GET /orders (cliente). */
export interface OrderListItem {
  readonly id: string;
  readonly status: OrderStatus;
  readonly scheduledFor?: string | null;
  readonly finalPrice?: number | null;
  readonly estimatedPrice?: number | null;
  readonly expiresAt?: string | null;
  readonly service: {
    readonly title: string;
    readonly provider?: { readonly user?: { readonly name?: string | null } | null } | null;
  };
}

export interface OrderTimelineEvent {
  readonly type: string;
  readonly title: string;
  readonly description?: string | null;
  readonly date: string;
}

/** GET /orders/:id visto pelo cliente. */
export interface OrderDetails {
  readonly id: string;
  readonly status: OrderStatus;
  readonly expiresAt?: string | null;
  readonly service: { readonly id: string; readonly title: string; readonly estimatedPrice: number };
  readonly provider: {
    readonly id: string;
    readonly name: string;
    readonly photoUrl?: string | null;
    readonly ratingAvg: number;
    readonly ratingCount: number;
    readonly verified: boolean;
  };
  readonly schedule: {
    readonly requestedAt: string;
    readonly scheduledFor?: string | null;
    readonly scheduledEnd?: string | null;
  };
  readonly address: {
    readonly street?: string | null;
    readonly number?: string | null;
    readonly complement?: string | null;
    readonly neighborhood?: string | null;
    readonly city?: string | null;
    readonly state?: string | null;
  } | null;
  readonly cancellation: { readonly label: string; readonly note?: string | null } | null;
  readonly payment: {
    readonly status: string;
    readonly estimatedAmount: number;
    readonly finalAmount: number | null;
  } | null;
  readonly timeline: readonly OrderTimelineEvent[];
}
