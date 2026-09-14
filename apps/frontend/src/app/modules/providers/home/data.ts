import {
  faArrowTrendUp,
  faBriefcase,
  faCalendarCheck,
  faStar,
  faWallet,
} from '@fortawesome/free-solid-svg-icons';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';

export interface ProviderSummary {
  id: 'today' | 'month' | 'services' | 'rating';
  title: string;
  value: string;
  description: string;
  icon: IconDefinition;
  trend: 'positive' | 'neutral';
}

export interface RevenueByMonth {
  month: string;
  revenue: number;
}

export type RequestStatus = 'pending' | 'accepted' | 'declined';

export interface PendingRequest {
  id: string | number;
  clientName: string;
  service: string;
  date: string;
  time: string;
  address: string;
  amount: number;
  status: RequestStatus;
}

export interface CompletedService {
  id: string | number;
  clientName: string;
  service: string;
  date: string;
  amount: number;
  rating: number;
}

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
    rating: number | null;
  }>;
  insights: {
    mostRequestedService: string | null;
    averageTicket: number;
    mostServedNeighborhood: string | null;
    monthlyGrowth: number | null;
  };
}

export interface ProviderInsight {
  id: string;
  label: string;
  value: string;
  icon: IconDefinition;
}

export const providerSummary: ProviderSummary[] = [
  {
    id: 'today',
    title: 'Ganhos hoje',
    value: '',
    description: '',
    icon: faWallet,
    trend: 'neutral',
  },
  {
    id: 'month',
    title: 'Ganhos do mês',
    value: '',
    description: '',
    icon: faArrowTrendUp,
    trend: 'neutral',
  },
  {
    id: 'services',
    title: 'Serviços realizados',
    value: '',
    description: '',
    icon: faBriefcase,
    trend: 'neutral',
  },
  {
    id: 'rating',
    title: 'Avaliação média',
    value: '',
    description: '',
    icon: faStar,
    trend: 'neutral',
  },
];

export const providerInsights: ProviderInsight[] = [
  { id: 'popular', label: 'Serviço mais solicitado', value: '', icon: faBriefcase },
  { id: 'ticket', label: 'Ticket médio', value: '', icon: faWallet },
  { id: 'region', label: 'Bairro mais atendido', value: '', icon: faCalendarCheck },
  { id: 'time', label: 'Melhor horário', value: '', icon: faCalendarCheck },
  { id: 'growth', label: 'Crescimento no mês', value: '', icon: faArrowTrendUp },
];
