import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, map, of, startWith, Subject, switchMap } from 'rxjs';

import { environment } from '@environments/environment';
import type { ProviderHomeData, RevenueByMonth } from '@modules/providers/home/data';
import { providerHomeEarnings } from '@modules/providers/home/provider-home.earnings';
import { ProviderRevenueChartComponent } from '@shared/components/functional/provider-revenue-chart/provider-revenue-chart';
import { TgBadgeComponent, type TgBadgeTone } from '@shared/design-system/badge/tg-badge.component';
import { TgButtonComponent } from '@shared/design-system/button/tg-button.component';
import { TgCardComponent } from '@shared/design-system/card/tg-card.component';
import { TgSheetComponent } from '@shared/design-system/dialog/tg-sheet.component';
import { TgEmptyStateComponent } from '@shared/design-system/empty-state/tg-empty-state.component';
import { TgAlertComponent } from '@shared/design-system/feedback/tg-alert.component';
import { TgFieldComponent } from '@shared/design-system/field/tg-field.component';
import { TgInputDirective } from '@shared/design-system/field/tg-input.directive';
import { TgLoadingComponent, TgLoadingSkeletonDirective } from '@shared/design-system/skeleton/tg-loading.component';
import { TgSkeletonComponent } from '@shared/design-system/skeleton/tg-skeleton.component';

export interface Settlement {
  orderId: string;
  amount: number;
  status: string;
  completedAt: string | null;
}

export type PixType = 'CPF' | 'CNPJ' | 'PHONE' | 'EMAIL' | 'RANDOM';

export interface PixDestination {
  key: string;
  type: PixType;
}

interface PixTypeInfo {
  value: PixType;
  label: string;
  placeholder: string;
  hint: string;
  inputmode: 'numeric' | 'tel' | 'email' | 'text';
}

export const PIX_TYPES: readonly PixTypeInfo[] = [
  { value: 'CPF', label: 'CPF', placeholder: '000.000.000-00', hint: 'Só os 11 números do CPF.', inputmode: 'numeric' },
  { value: 'CNPJ', label: 'CNPJ', placeholder: '00.000.000/0000-00', hint: 'Só os 14 números do CNPJ.', inputmode: 'numeric' },
  { value: 'PHONE', label: 'Celular', placeholder: '(11) 91234-5678', hint: 'Com DDD.', inputmode: 'tel' },
  { value: 'EMAIL', label: 'E-mail', placeholder: 'voce@email.com', hint: 'O e-mail cadastrado como chave no seu banco.', inputmode: 'email' },
  {
    value: 'RANDOM',
    label: 'Chave aleatória',
    placeholder: '123e4567-e89b-12d3-a456-426614174000',
    hint: 'Copie a chave como aparece no app do banco.',
    inputmode: 'text',
  },
];

/**
 * Em que total o repasse entra. `received`: pago. `incoming`: na fila ou
 * em envio, sem nada que o segure. `held`: em análise ou bloqueado, sem
 * previsão; não entra em nenhum total. `failed`: não entra em nenhum.
 */
export type SettlementGroup = 'received' | 'incoming' | 'held' | 'failed';

interface SettlementInfo {
  group: SettlementGroup;
  label: string;
  tone: TgBadgeTone;
}

/**
 * Os status do repasse (`PaymentSettlement.status`), como o backend os usa
 * (`settlement.service.ts`): READY entra na fila de envio; SUBMITTING e
 * PENDING estão no gateway; SUCCEEDED é o PIX concluído; FAILED é a recusa
 * do gateway; REVIEW segue na fila, mas aguardando conciliação; BLOCKED é o
 * repasse barrado por pagamento, confirmação ou disputa, e não sai sem ação
 * da operação. Por isso REVIEW e BLOCKED ficam fora de "A receber".
 */
export const SETTLEMENT_STATUS: Readonly<Record<string, SettlementInfo>> = {
  READY: { group: 'incoming', label: 'Aguardando envio', tone: 'waiting' },
  SUBMITTING: { group: 'incoming', label: 'Enviando', tone: 'progress' },
  PENDING: { group: 'incoming', label: 'Em processamento', tone: 'progress' },
  SUCCEEDED: { group: 'received', label: 'Pago', tone: 'done' },
  FAILED: { group: 'failed', label: 'Falhou', tone: 'cancelled' },
  REVIEW: { group: 'held', label: 'Em análise', tone: 'waiting' },
  BLOCKED: { group: 'held', label: 'Bloqueado', tone: 'cancelled' },
};
/** Status que a tela não conhece: nunca soma em nada e aparece como em análise. */
const UNKNOWN_STATUS: SettlementInfo = { group: 'held', label: 'Em análise', tone: 'neutral' };

export function settlementInfo(status: string): SettlementInfo {
  return Object.prototype.hasOwnProperty.call(SETTLEMENT_STATUS, status) ? SETTLEMENT_STATUS[status] : UNKNOWN_STATUS;
}

/** Somas em centavos (sem erro de ponto flutuante), devolvidas em reais. */
export function settlementTotals(items: readonly Settlement[]): { received: number; incoming: number; held: number } {
  const cents = { received: 0, incoming: 0, held: 0 };
  for (const item of items) {
    const group = settlementInfo(item.status).group;
    const amount = Number(item.amount);
    if (group === 'failed' || !Number.isFinite(amount)) continue;
    cents[group] += Math.round(amount * 100);
  }
  return { received: cents.received / 100, incoming: cents.incoming / 100, held: cents.held / 100 };
}
const MONEY = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const DAY = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' });
const TIME = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });

/**
 * Ganhos do profissional (Etapa 10), em `/provider/recebimentos`: a chave
 * PIX que recebe os repasses e os repasses recentes. Endpoints de antes:
 * GET e PUT /payments/payout-destination e GET .../settlements (até 50);
 * o gráfico usa o painel da home (GET /auth/provider-home).
 */
@Component({
  selector: 'app-provider-payout',
  imports: [
    FormsModule,
    ProviderRevenueChartComponent,
    RouterLink,
    TgAlertComponent,
    TgBadgeComponent,
    TgButtonComponent,
    TgCardComponent,
    TgEmptyStateComponent,
    TgFieldComponent,
    TgInputDirective,
    TgLoadingComponent,
    TgLoadingSkeletonDirective,
    TgSheetComponent,
    TgSkeletonComponent,
  ],
  templateUrl: './provider-payout.page.html',
  styleUrl: './provider-payout.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProviderPayoutPage {
  readonly #http = inject(HttpClient);
  readonly #destroyRef = inject(DestroyRef);
  readonly #url = environment.url + '/payments/payout-destination';

  readonly pixTypes = PIX_TYPES;

  /** Chave salva (null enquanto carrega ou se falhou). Chave vazia: ainda não cadastrou. */
  readonly destination = signal<PixDestination | null>(null);
  readonly destinationLoading = signal(true);
  readonly destinationError = signal(false);

  /** Gráfico dos últimos 6 meses, do mesmo painel da home (GET /auth/provider-home). */
  readonly revenue = signal<RevenueByMonth[]>([]);
  /** Já houve algum serviço concluído ou ganho (mesma regra da home). */
  readonly hasHistory = signal(false);
  readonly chartLoading = signal(true);
  readonly chartError = signal(false);

  readonly settlements = signal<Settlement[]>([]);
  readonly settlementsLoading = signal(true);
  readonly settlementsError = signal(false);

  /**
   * Totais dos repasses listados (ver `SETTLEMENT_STATUS`). Na falha ou
   * enquanto carrega, null: a tela nunca mostra R$ 0,00 sem dados.
   */
  readonly totals = computed(() =>
    this.settlementsLoading() || this.settlementsError() ? null : settlementTotals(this.settlements()),
  );
  /**
   * Profissional que ainda não ganhou nada: sem histórico no painel e sem
   * repasses. A tela troca resumo, gráfico e lista por um estado vazio.
   */
  readonly noEarnings = computed(
    () =>
      !this.chartLoading() &&
      !this.chartError() &&
      !this.hasHistory() &&
      !this.settlementsLoading() &&
      !this.settlementsError() &&
      this.settlements().length === 0,
  );
  readonly failedCount = computed(() => this.settlements().filter((item) => item.status === 'FAILED').length);

  readonly sheet = viewChild.required<TgSheetComponent>('sheet');
  draft: PixDestination = { key: '', type: 'CPF' };
  readonly submitted = signal(false);
  readonly saving = signal(false);
  readonly saveError = signal('');
  readonly message = signal('');

  // Uma fila por recurso: cada "Tentar de novo" recarrega só o seu, e o
  // switchMap descarta a resposta de uma consulta antiga do mesmo recurso.
  readonly #destinationLoads = new Subject<void>();
  readonly #revenueLoads = new Subject<void>();
  readonly #settlementLoads = new Subject<void>();

  constructor() {
    this.#destinationLoads
      .pipe(
        startWith(undefined),
        switchMap(() => {
          this.destinationLoading.set(true);
          this.destinationError.set(false);
          return this.#http.get<Partial<PixDestination>>(this.#url).pipe(
            map((value) => ({ ok: true as const, value: toDestination(value) })),
            catchError(() => of({ ok: false as const })),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((result) => {
        this.destination.set(result.ok ? result.value : null);
        this.destinationError.set(!result.ok);
        this.destinationLoading.set(false);
      });

    this.#revenueLoads
      .pipe(
        startWith(undefined),
        switchMap(() => {
          this.chartLoading.set(true);
          this.chartError.set(false);
          return this.#http.get<ProviderHomeData>(environment.url + '/auth/provider-home').pipe(
            map((home) => ({ ok: true as const, earnings: providerHomeEarnings(home) })),
            catchError(() => of({ ok: false as const })),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((result) => {
        this.revenue.set(result.ok ? result.earnings.revenue : []);
        this.hasHistory.set(result.ok && result.earnings.hasHistory);
        this.chartError.set(!result.ok);
        this.chartLoading.set(false);
      });

    this.#settlementLoads
      .pipe(
        startWith(undefined),
        switchMap(() => {
          this.settlementsLoading.set(true);
          this.settlementsError.set(false);
          return this.#http.get<Settlement[]>(this.#url + '/settlements').pipe(
            map((value) => ({ ok: true as const, value: Array.isArray(value) ? value : [] })),
            catchError(() => of({ ok: false as const })),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((result) => {
        this.settlements.set(result.ok ? result.value : []);
        this.settlementsError.set(!result.ok);
        this.settlementsLoading.set(false);
      });
  }

  loadDestination(): void {
    this.#destinationLoads.next();
  }

  loadRevenue(): void {
    this.#revenueLoads.next();
  }

  loadSettlements(): void {
    this.#settlementLoads.next();
  }

  money(value: number): string {
    return MONEY.format(value);
  }

  /** "14/11/2026 às 12:20", no horário de São Paulo. */
  paidAt(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    return `${DAY.format(date)} às ${TIME.format(date)}`;
  }

  typeInfo(type: PixType): PixTypeInfo {
    return PIX_TYPES.find((item) => item.value === type) ?? PIX_TYPES[0];
  }

  status(status: string): SettlementInfo {
    return settlementInfo(status);
  }

  openEdit(): void {
    const current = this.destination();
    this.draft = { key: current?.key ?? '', type: current?.type ?? 'CPF' };
    this.submitted.set(false);
    this.saveError.set('');
    this.message.set('');
    this.sheet().open();
  }

  /** Erro da chave, só depois de tentar salvar. */
  keyError(): string {
    if (!this.submitted()) return '';
    return validatePix(this.draft) ?? '';
  }

  save(): void {
    if (this.saving()) return;
    this.submitted.set(true);
    this.saveError.set('');
    if (validatePix(this.draft)) return;

    // Envia a chave já normalizada, do jeito que a API guarda.
    const payload: PixDestination = { type: this.draft.type, key: normalizePix(this.draft) };
    this.saving.set(true);
    this.#http
      .put<Partial<PixDestination>>(this.#url, payload)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (saved) => {
          this.saving.set(false);
          // A API devolve a chave normalizada (sem pontos e traços).
          this.destination.set(saved?.key ? toDestination(saved) : payload);
          this.destinationError.set(false);
          this.sheet().close();
          this.message.set('Chave PIX salva. Ela vale para os próximos repasses.');
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.saveError.set(apiMessage(error) ?? 'Não foi possível salvar. Confira o tipo e a chave PIX.');
        },
      });
  }
}

function toDestination(value: Partial<PixDestination> | null | undefined): PixDestination {
  const type = PIX_TYPES.some((item) => item.value === value?.type) ? (value!.type as PixType) : 'CPF';
  return { key: typeof value?.key === 'string' ? value.key : '', type };
}

/**
 * A chave como a API a guarda (`normalizePixDestination`): CPF, CNPJ e
 * celular sem espaços, parênteses, pontos, traços e "+"; e-mail e chave
 * aleatória sem espaços nas pontas. A barra do CNPJ também sai aqui: a API
 * a recusaria, e ela só aparece porque é como o CNPJ costuma ser copiado.
 */
export function normalizePix({ key, type }: PixDestination): string {
  if (type === 'CNPJ') return key.replace(/[\s().+\-/]/g, '');
  if (type === 'CPF' || type === 'PHONE') return key.replace(/[\s().+-]/g, '');
  return key.trim();
}

/** Limites do DTO da API (`@MinLength(3) @MaxLength(254)`), aplicados à chave enviada. */
export const PIX_KEY_MIN = 3;
export const PIX_KEY_MAX = 254;

/**
 * As regras da API para a chave já normalizada (as mesmas expressões de
 * `normalizePixDestination` e os limites do DTO), com o texto que diz como
 * corrigir. O que passa aqui a API aceita.
 */
export function validatePix(destination: PixDestination): string | null {
  const key = normalizePix(destination);
  if (!key) return 'Informe a chave PIX.';
  if (key.length > PIX_KEY_MAX) return `Use até ${PIX_KEY_MAX} caracteres.`;
  switch (destination.type) {
    case 'CPF':
      return /^\d{11}$/.test(key) ? null : 'O CPF tem 11 números.';
    case 'CNPJ':
      return /^\d{14}$/.test(key) ? null : 'O CNPJ tem 14 números.';
    case 'PHONE':
      return /^(?:55)?\d{10,11}$/.test(key) ? null : 'Informe o celular com DDD.';
    case 'EMAIL':
      return key.length >= PIX_KEY_MIN && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(key) ? null : 'Informe um e-mail válido.';
    case 'RANDOM':
      return /^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i.test(key)
        ? null
        : 'A chave aleatória tem 32 letras e números, com traços.';
  }
}

function apiMessage(error: unknown): string | null {
  if (!(error instanceof HttpErrorResponse)) return null;
  const body: unknown = error.error;
  if (body && typeof body === 'object' && 'message' in body) {
    const message: unknown = body.message;
    if (Array.isArray(message)) return message.filter((m) => typeof m === 'string').join(' ') || null;
    if (typeof message === 'string' && message.trim()) return message.trim();
  }
  return null;
}
