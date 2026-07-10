import type { TaskGoAdminRole } from '@taskgo/shared';

export type ProviderStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'BLOCKED';
export type ProviderDecisionAction = 'APPROVE' | 'REJECT' | 'BLOCK' | 'UNBLOCK';

export interface ProviderDashboardQuery {
  readonly from?: string;
  readonly to?: string;
}

export interface ProviderPageQuery {
  readonly page?: number;
  readonly limit?: number;
  readonly status?: ProviderStatus;
  readonly submittedFrom?: string;
  readonly submittedTo?: string;
}

export interface ProviderPage<T> {
  readonly data: readonly T[];
  readonly meta: {
    readonly total: number;
    readonly page: number;
    readonly limit: number;
    readonly totalPages: number;
  };
}

export interface ProviderQueueItem {
  readonly id: string;
  readonly submittedAt: string;
  readonly updatedAt: string;
  readonly identity: ProviderIdentity;
  readonly verification: ProviderVerification;
  readonly status: ProviderLifecycleStatus;
  readonly serviceSummary: { readonly count: number };
  readonly reviewSummary: {
    readonly averageRating: number | null;
    readonly ratingCount: number;
    readonly reviewCount: number;
  };
  readonly decisionSummary: { readonly count: number };
  readonly capabilities: ProviderCapabilities;
}

export interface ProviderDetails extends ProviderQueueItem {
  readonly bio: string | null;
  readonly paymentContext: {
    readonly pagarmeRecipientId: string | null;
  };
  readonly services: readonly ProviderService[];
  readonly serviceAreas: readonly ProviderServiceArea[];
  readonly locations: readonly ProviderLocation[];
  readonly operationalHistory: {
    readonly ordersByStatus: readonly { readonly status: string; readonly count: number }[];
    readonly recentOrders: readonly ProviderRecentOrder[];
  };
  readonly decisionContext: {
    readonly latestDecision: ProviderDecision | null;
    readonly recentDecisions: readonly ProviderDecision[];
    readonly firstDecisionAt: string | null;
  };
}

export interface ProviderDetailsResponse {
  readonly provider: ProviderDetails;
}

export interface ProviderLifecycleResponse {
  readonly provider: {
    readonly id: string;
    readonly verification: Pick<ProviderVerification, 'providerVerified'>;
    readonly status: ProviderLifecycleStatus;
  };
}

export interface ProviderIdentity {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly phone: string | null;
  readonly cpf: string | null;
  readonly photoUrl: string | null;
  readonly userCreatedAt: string;
}

export interface ProviderVerification {
  readonly providerVerified: boolean;
  readonly emailVerified: boolean;
  readonly phoneVerified: boolean;
}

export interface ProviderLifecycleStatus {
  readonly current: ProviderStatus;
  readonly changedAt: string;
}

export interface ProviderCapabilities {
  readonly acceptsPix: boolean;
  readonly acceptsCard: boolean;
  readonly emergencyCare: boolean;
  readonly available24h: boolean;
}

export interface ProviderService {
  readonly id: string;
  readonly title: string;
  readonly description: string | null;
  readonly category: string | null;
  readonly basePrice: number | null;
  readonly status: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ProviderServiceArea {
  readonly id: string;
  readonly mode: string;
  readonly centerLat: number | null;
  readonly centerLng: number | null;
  readonly radiusKm: number | null;
  readonly active: boolean;
  readonly createdAt: string;
}

export interface ProviderLocation {
  readonly id: string;
  readonly lat: number;
  readonly lng: number;
  readonly capturedAt: string;
}

export interface ProviderRecentOrder {
  readonly id: string;
  readonly status: string;
  readonly requestedAt: string;
  readonly scheduledFor: string | null;
  readonly finalPrice: number | null;
  readonly service: {
    readonly id: string;
    readonly title: string;
  };
}

export interface ProviderDecision {
  readonly id: string;
  readonly action: ProviderDecisionAction;
  readonly fromStatus: ProviderStatus;
  readonly toStatus: ProviderStatus;
  readonly reason: string | null;
  readonly createdAt: string;
  readonly actor: {
    readonly id: string;
    readonly role: TaskGoAdminRole;
    readonly name: string;
    readonly email: string;
    readonly active: boolean;
  };
}

export interface ProviderDashboard {
  readonly period: {
    readonly from: string;
    readonly to: string;
    readonly defaultDays: number;
    readonly maxDays: number;
  };
  readonly queue: {
    readonly pending: number;
  };
  readonly decisions: {
    readonly approve: number;
    readonly reject: number;
    readonly block: number;
    readonly unblock: number;
    readonly total: number;
  };
  readonly reviewDuration: {
    readonly averageMs: number | null;
    readonly averageHours: number | null;
    readonly reviewedProviders: number;
  };
  readonly recentSensitiveActions: readonly ProviderDashboardAction[];
}

export interface ProviderDashboardAction {
  readonly id: string;
  readonly action: ProviderDecisionAction;
  readonly fromStatus: ProviderStatus;
  readonly toStatus: ProviderStatus;
  readonly reason: string | null;
  readonly createdAt: string;
  readonly provider: {
    readonly id: string;
    readonly status: ProviderStatus;
    readonly name: string;
    readonly email: string;
  };
  readonly actor: {
    readonly id: string;
    readonly role: TaskGoAdminRole;
    readonly name: string;
    readonly email: string;
    readonly active: boolean;
  };
}

export interface ProviderActionView {
  readonly action: ProviderDecisionAction;
  readonly label: string;
  readonly consequence: string;
  readonly requiresReason: boolean;
}

export const PROVIDER_STATUSES: readonly ProviderStatus[] = [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'BLOCKED',
];

export const PROVIDER_ACTIONS: Record<ProviderDecisionAction, ProviderActionView> = {
  APPROVE: {
    action: 'APPROVE',
    label: 'Approve',
    consequence: 'The provider becomes active and available for marketplace work.',
    requiresReason: false,
  },
  REJECT: {
    action: 'REJECT',
    label: 'Reject',
    consequence: 'The application closes and the provider will remain unavailable.',
    requiresReason: true,
  },
  BLOCK: {
    action: 'BLOCK',
    label: 'Block',
    consequence: 'The provider is removed from active marketplace operation.',
    requiresReason: true,
  },
  UNBLOCK: {
    action: 'UNBLOCK',
    label: 'Unblock',
    consequence: 'The provider returns to approved active operation.',
    requiresReason: true,
  },
};

export function availableProviderActions(
  role: TaskGoAdminRole | undefined,
  status: ProviderStatus | undefined,
): readonly ProviderActionView[] {
  if (role !== 'ADMINISTRATOR' || !status) return [];

  if (status === 'PENDING') {
    return [PROVIDER_ACTIONS.APPROVE, PROVIDER_ACTIONS.REJECT];
  }

  if (status === 'APPROVED') {
    return [PROVIDER_ACTIONS.BLOCK];
  }

  if (status === 'BLOCKED') {
    return [PROVIDER_ACTIONS.UNBLOCK];
  }

  return [];
}
