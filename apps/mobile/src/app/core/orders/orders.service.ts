import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { MOBILE_ENVIRONMENT } from '@app/core/config/mobile-environment.token';
import { Paginated } from '@app/core/catalog/catalog.models';
import {
  Availability,
  NewOrder,
  OrderDetails,
  OrderListItem,
  OrderStatus,
  ProviderProfile,
  SavedAddress
} from './orders.models';

/** Quantos dias de agenda o app mostra a partir de hoje. */
export const AVAILABILITY_DAYS = 14;

@Injectable({ providedIn: 'root' })
export class OrdersService {
  readonly #http = inject(HttpClient);
  readonly #apiUrl = inject(MOBILE_ENVIRONMENT).apiUrl;

  provider(id: string): Observable<ProviderProfile | null> {
    return this.#http
      .get<ProviderProfile | null>(`${this.#apiUrl}/provider/${encodeURIComponent(id)}`)
      .pipe(
        map((provider) =>
          provider
            ? {
                ...provider,
                ratingAvg: decimal(provider.ratingAvg),
                services: provider.services.map((s) => ({ ...s, basePrice: decimal(s.basePrice) }))
              }
            : null
        )
      );
  }

  availability(providerId: string, serviceId: string, now = new Date()): Observable<Availability> {
    const { from, to } = availabilityRange(now);
    return this.#http.get<Availability>(
      `${this.#apiUrl}/provider/${encodeURIComponent(providerId)}/availability`,
      { params: { from, to, serviceId } }
    );
  }

  /** Endereços que o pedido aceita: ativos e com localização. */
  addresses(): Observable<readonly SavedAddress[]> {
    return this.#http
      .get<Paginated<SavedAddress>>(`${this.#apiUrl}/user/me/addresses`, {
        params: { limit: 100 }
      })
      .pipe(
        map((page) =>
          page.data.filter(
            (a) => a.active !== false && typeof a.lat === 'number' && typeof a.lng === 'number'
          )
        )
      );
  }

  create(order: NewOrder): Observable<{ id: string }> {
    return this.#http.post<{ id: string }>(`${this.#apiUrl}/orders`, {
      ...order,
      channel: 'APP'
    });
  }

  list(): Observable<readonly OrderListItem[]> {
    return this.#http.get<OrderListItem[]>(`${this.#apiUrl}/orders`);
  }

  details(id: string): Observable<OrderDetails> {
    return this.#http.get<OrderDetails>(`${this.#apiUrl}/orders/${encodeURIComponent(id)}`);
  }
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  AGUARDANDO_APROVACAO: 'Aguardando o profissional',
  REJEITADO: 'Recusado',
  AGUARDANDO_PAGAMENTO: 'Aguardando pagamento',
  AGENDADO: 'Agendado',
  EM_DESLOCAMENTO: 'Profissional a caminho',
  EM_ANDAMENTO: 'Em andamento',
  AGUARDANDO_CONFIRMACAO_CLIENTE: 'Aguardando sua confirmação',
  CONCLUIDO: 'Concluído',
  CANCELADO: 'Cancelado',
  DISPUTA: 'Em análise'
};

export function orderStatusLabel(status: string): string {
  return STATUS_LABELS[status as OrderStatus] ?? 'Em atualização';
}

export function orderStatusColor(status: string): string {
  switch (status) {
    case 'CONCLUIDO':
      return 'success';
    case 'CANCELADO':
    case 'REJEITADO':
      return 'medium';
    case 'DISPUTA':
    case 'AGUARDANDO_PAGAMENTO':
    case 'AGUARDANDO_CONFIRMACAO_CLIENTE':
      return 'warning';
    default:
      return 'primary';
  }
}

/** Traduz as recusas conhecidas de POST /orders para o cliente. */
export function createOrderErrorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) return 'Sem conexão com o TaskGo. Verifique sua internet.';
    const raw = error.error?.message;
    const message = String(Array.isArray(raw) ? raw[0] : (raw ?? ''));
    if (message.includes('no longer available') || message.includes('future scheduled slot')) {
      return 'Esse horário não está mais disponível. Escolha outro.';
    }
    if (message.includes('outside the provider service area')) {
      return 'Este profissional não atende no endereço escolhido.';
    }
    if (message.includes('complete active address')) {
      return 'Esse endereço está incompleto. Atualize-o no site e tente de novo.';
    }
    if (message.includes('not available') || error.status === 404) {
      return 'Este serviço não está disponível no momento.';
    }
  }
  return 'Não foi possível enviar o pedido. Tente de novo em instantes.';
}

/**
 * GET /provider/:id ainda devolve os campos Decimal no formato interno do
 * decimal.js ({ s, e, d }) em vez de número. Aceita os dois formatos.
 */
export function decimal(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  if (value && typeof value === 'object') {
    const { s, e, d } = value as { s?: unknown; e?: unknown; d?: unknown };
    if (
      (s === 1 || s === -1) &&
      Number.isInteger(e) &&
      Array.isArray(d) &&
      d.length > 0 &&
      d.every((chunk) => Number.isInteger(chunk) && chunk >= 0)
    ) {
      // d guarda os dígitos em blocos de 7 (base 1e7); e é o expoente do primeiro dígito.
      const digits = String(d[0]) + d.slice(1).map((chunk) => String(chunk).padStart(7, '0')).join('');
      return Number(`${s < 0 ? '-' : ''}0.${digits}e${(e as number) + 1}`);
    }
  }
  return NaN;
}

/** Fuso da agenda dos prestadores (o mesmo do backend). */
export const BOOKING_TIMEZONE = 'America/Sao_Paulo';

/**
 * Os 14 dias corridos da agenda, a partir de hoje em São Paulo, sem depender
 * do fuso configurado no aparelho.
 */
export function availabilityRange(now: Date): { from: string; to: string } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: BOOKING_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
      .formatToParts(now)
      .map(({ type, value }) => [type, Number(value)])
  );
  // Date.UTC normaliza dia 32, mês 13 etc.: a conta é de calendário, não de milissegundos.
  const day = (offset: number) =>
    new Date(Date.UTC(parts['year'], parts['month'] - 1, parts['day'] + offset))
      .toISOString()
      .slice(0, 10);
  return { from: day(0), to: day(AVAILABILITY_DAYS - 1) };
}
