/** Ganho de um mês no gráfico (a parte do prestador, em reais). */
export interface RevenueByMonth {
  month: string;
  revenue: number;
}

/** Resposta do painel do prestador (GET /auth/provider-home). */
export interface ProviderHomeData {
  earnings: {
    today: number;
    month: number;
    previousMonth: number;
    lastSixMonths: RevenueByMonth[];
  };
  services: { completedTotal: number; completedThisWeek: number };
  rating: { average: number; count: number };
  pendingRequests: Array<{
    id: string;
    clientName: string;
    service: string;
    scheduledFor: string | null;
    address: string;
    amount: number;
    status: 'pending';
  }>;
  activeOrders?: Array<{
    id: string;
    clientName: string;
    service: string;
    scheduledFor: string | null;
    amount: number;
    status: string;
  }>;
  recentServices: Array<{
    id: string;
    clientName: string;
    service: string;
    completedAt: string;
    amount: number;
    paymentStatus?: string | null;
    paidAt?: string | null;
    rating: number | null;
  }>;
  insights: {
    mostRequestedService: string | null;
    averageTicket: number;
    mostServedNeighborhood: string | null;
    monthlyGrowth: number | null;
  };
}
