import { Injectable } from '@nestjs/common';
import { OrderStatus, PaymentStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

const DASHBOARD_TIMEZONE = 'America/Sao_Paulo';
const ACTIVE_ORDER_STATUSES = new Set<OrderStatus>([
  OrderStatus.AGUARDANDO_PAGAMENTO,
  OrderStatus.AGENDADO,
  OrderStatus.EM_DESLOCAMENTO,
  OrderStatus.EM_ANDAMENTO,
  OrderStatus.AGUARDANDO_CONFIRMACAO_CLIENTE,
]);
const MONTH_LABELS = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
];

@Injectable()
export class ProviderHomeService {
  constructor(private readonly prisma: PrismaService) {}

  async getForProvider(providerId: bigint) {
    const now = new Date();
    const todayKey = this.dateKey(now);
    const monthKeys = this.lastMonthKeys(now, 6);

    const [provider, orders] = await Promise.all([
      this.prisma.provider.findUnique({
        where: { id: providerId },
        select: { ratingAvg: true, ratingCount: true },
      }),
      this.prisma.order.findMany({
        where: { service: { is: { providerId } } },
        orderBy: { requestedAt: 'desc' },
        include: {
          client: { select: { name: true } },
          service: { select: { title: true } },
          payment: {
            select: {
              amount: true,
              providerAmount: true,
              status: true,
              paidAt: true,
            },
          },
          addressSnap: {
            select: { neighborhood: true, city: true, state: true },
          },
          review: { select: { rating: true } },
        },
      }),
    ]);

    const completed = orders.filter(
      ({ status }) => status === OrderStatus.CONCLUIDO,
    );
    const paid = completed.filter(
      ({ payment }) =>
        payment?.status === PaymentStatus.CAPTURED ||
        payment?.status === PaymentStatus.RELEASED,
    );
    const revenueFor = (order: (typeof paid)[number]) =>
      Number(
        order.payment?.providerAmount ??
          order.payment?.amount ??
          order.finalPrice ??
          0,
      );
    const revenueDateFor = (order: (typeof paid)[number]) =>
      order.payment?.paidAt ?? order.scheduledFor ?? order.requestedAt;

    const revenueByMonth = monthKeys.map(({ key, label }) => ({
      month: label,
      revenue: paid
        .filter((order) => this.monthKey(revenueDateFor(order)) === key)
        .reduce((total, order) => total + revenueFor(order), 0),
    }));
    const monthRevenue = revenueByMonth.at(-1)?.revenue ?? 0;
    const previousMonthRevenue = revenueByMonth.at(-2)?.revenue ?? 0;
    const todayRevenue = paid
      .filter((order) => this.dateKey(revenueDateFor(order)) === todayKey)
      .reduce((total, order) => total + revenueFor(order), 0);

    const pendingRequests = orders
      .filter(({ status }) => status === OrderStatus.AGUARDANDO_APROVACAO)
      .slice(0, 10)
      .map((order) => ({
        id: order.id.toString(),
        clientName: order.client.name,
        service: order.service.title,
        scheduledFor: order.scheduledFor?.toISOString() ?? null,
        address: this.formatAddress(order.addressSnap),
        amount: Number(order.finalPrice ?? order.payment?.amount ?? 0),
        status: 'pending' as const,
      }));

    const activeOrders = orders
      .filter(({ status }) => ACTIVE_ORDER_STATUSES.has(status))
      .slice(0, 10)
      .map((order) => ({
        id: order.id.toString(),
        clientName: order.client.name,
        service: order.service.title,
        scheduledFor: order.scheduledFor?.toISOString() ?? null,
        amount: Number(order.finalPrice ?? order.payment?.amount ?? 0),
        status: order.status,
      }));

    const recentServices = completed.slice(0, 5).map((order) => ({
      id: order.id.toString(),
      clientName: order.client.name,
      service: order.service.title,
      completedAt: (order.scheduledFor ?? order.requestedAt).toISOString(),
      amount: Number(
        order.payment?.providerAmount ??
          order.payment?.amount ??
          order.finalPrice ??
          0,
      ),
      rating: order.review?.rating ?? null,
    }));

    const mostRequested = this.mostFrequent(
      orders.map((order) => order.service.title),
    );
    const mostServedNeighborhood = this.mostFrequent(
      completed
        .map((order) => order.addressSnap?.neighborhood)
        .filter(Boolean) as string[],
    );
    const monthlyGrowth =
      previousMonthRevenue > 0
        ? ((monthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100
        : null;

    return {
      earnings: {
        today: todayRevenue,
        month: monthRevenue,
        previousMonth: previousMonthRevenue,
        lastSixMonths: revenueByMonth,
      },
      services: {
        completedTotal: completed.length,
        completedThisWeek: completed.filter((order) => {
          const age = this.daysAgo(
            order.scheduledFor ?? order.requestedAt,
            now,
          );
          return age >= 0 && age < 7;
        }).length,
      },
      rating: {
        average: Number(provider?.ratingAvg ?? 0),
        count: provider?.ratingCount ?? 0,
      },
      pendingRequests,
      activeOrders,
      recentServices,
      insights: {
        mostRequestedService: mostRequested,
        averageTicket: completed.length
          ? completed.reduce(
              (total, order) => total + Number(order.finalPrice ?? 0),
              0,
            ) / completed.length
          : 0,
        mostServedNeighborhood,
        monthlyGrowth,
      },
    };
  }

  private dateKey(date: Date): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: DASHBOARD_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  }

  private monthKey(date: Date): string {
    return this.dateKey(date).slice(0, 7);
  }

  private lastMonthKeys(now: Date, count: number) {
    return Array.from({ length: count }, (_, index) => {
      const date = new Date(
        now.getFullYear(),
        now.getMonth() - (count - 1 - index),
        1,
      );
      return {
        key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
        label: MONTH_LABELS[date.getMonth()],
      };
    });
  }

  private formatAddress(
    address: {
      neighborhood: string | null;
      city: string | null;
      state: string | null;
    } | null,
  ): string {
    if (!address) return '';
    return [
      address.neighborhood,
      [address.city, address.state].filter(Boolean).join(' - '),
    ]
      .filter(Boolean)
      .join(', ');
  }

  private mostFrequent(values: string[]): string | null {
    if (!values.length) return null;
    const counts = values.reduce(
      (map, value) => map.set(value, (map.get(value) ?? 0) + 1),
      new Map<string, number>(),
    );
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  }

  private daysAgo(date: Date, now: Date): number {
    return (now.getTime() - date.getTime()) / 86_400_000;
  }
}
