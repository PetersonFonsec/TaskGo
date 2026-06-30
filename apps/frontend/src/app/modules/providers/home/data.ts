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
    value: 'R$ 320',
    description: '+8% comparado a ontem',
    icon: faWallet,
    trend: 'positive',
  },
  {
    id: 'month',
    title: 'Ganhos do mês',
    value: 'R$ 4.820',
    description: '+12% em relação ao mês passado',
    icon: faArrowTrendUp,
    trend: 'positive',
  },
  {
    id: 'services',
    title: 'Serviços realizados',
    value: '48',
    description: '6 concluídos nesta semana',
    icon: faBriefcase,
    trend: 'neutral',
  },
  {
    id: 'rating',
    title: 'Avaliação média',
    value: '4.9',
    description: 'Com base em 42 avaliações',
    icon: faStar,
    trend: 'neutral',
  },
];

export const providerRevenue: RevenueByMonth[] = [
  { month: 'Jan', revenue: 1800 },
  { month: 'Fev', revenue: 2400 },
  { month: 'Mar', revenue: 2100 },
  { month: 'Abr', revenue: 3200 },
  { month: 'Mai', revenue: 4100 },
  { month: 'Jun', revenue: 4820 },
];

export const pendingRequests: PendingRequest[] = [
  {
    id: 1,
    clientName: 'Maria Souza',
    service: 'Instalação elétrica',
    date: 'Hoje',
    time: '14:00',
    address: 'São Bernardo do Campo - SP',
    amount: 180,
    status: 'pending',
  },
  {
    id: 2,
    clientName: 'Carlos Lima',
    service: 'Troca de chuveiro',
    date: 'Amanhã',
    time: '09:00',
    address: 'Santo André - SP',
    amount: 120,
    status: 'pending',
  },
  {
    id: 3,
    clientName: 'Fernanda Alves',
    service: 'Manutenção residencial',
    date: 'Sexta-feira',
    time: '16:30',
    address: 'São Paulo - SP',
    amount: 250,
    status: 'pending',
  },
];

export const completedServices: CompletedService[] = [
  {
    id: 1,
    clientName: 'João Silva',
    service: 'Instalação elétrica',
    date: '22 Jun',
    amount: 180,
    rating: 5,
  },
  {
    id: 2,
    clientName: 'Ana Pereira',
    service: 'Troca de tomada',
    date: '20 Jun',
    amount: 90,
    rating: 5,
  },
  {
    id: 3,
    clientName: 'Roberto Santos',
    service: 'Manutenção residencial',
    date: '18 Jun',
    amount: 240,
    rating: 4,
  },
];

export const providerInsights: ProviderInsight[] = [
  { id: 'popular', label: 'Serviço mais solicitado', value: 'Instalação elétrica', icon: faBriefcase },
  { id: 'ticket', label: 'Ticket médio', value: 'R$ 168', icon: faWallet },
  { id: 'region', label: 'Bairro mais atendido', value: 'Centro', icon: faCalendarCheck },
  { id: 'time', label: 'Melhor horário', value: '14h às 17h', icon: faCalendarCheck },
  { id: 'growth', label: 'Crescimento no mês', value: '+18%', icon: faArrowTrendUp },
];
