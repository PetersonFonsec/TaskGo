import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, forkJoin, map, of, Subject, switchMap } from 'rxjs';

import { environment } from '@environments/environment';
import { type TgBadgeTone, TgBadgeComponent } from '@shared/design-system/badge/tg-badge.component';
import { TgButtonComponent } from '@shared/design-system/button/tg-button.component';
import { TgCardComponent } from '@shared/design-system/card/tg-card.component';
import { TgEmptyStateComponent } from '@shared/design-system/empty-state/tg-empty-state.component';
import { TgAlertComponent } from '@shared/design-system/feedback/tg-alert.component';
import { TgFieldComponent } from '@shared/design-system/field/tg-field.component';
import { TgInputDirective } from '@shared/design-system/field/tg-input.directive';
import { TgIconComponent } from '@shared/design-system/icon/tg-icon.component';
import { TgLoadingComponent, TgLoadingSkeletonDirective } from '@shared/design-system/skeleton/tg-loading.component';
import { TgSkeletonComponent } from '@shared/design-system/skeleton/tg-skeleton.component';
import { Order } from '@shared/service/order/order';
import type { OrderDetails } from '@shared/service/order/order.model';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';

/** Status do caso (`DisputeStatus` em apps/backend/src/prisma/schema.prisma). */
export type DisputeStatus = 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'REJECTED';

/** Um caso do pedido, como GET /orders/:id/disputes devolve (BigInt vira texto). */
export interface OrderDispute {
  id: string;
  orderId: string;
  openedBy: 'CLIENTE' | 'PRESTADOR' | 'ADMIN' | string;
  openedById: string | null;
  reason: string;
  description: string;
  status: DisputeStatus | string;
  resolution: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

interface DisputeStatusInfo {
  label: string;
  tone: TgBadgeTone;
  /** Caso ainda aberto: bloqueia um caso novo e a confirmação da conclusão. */
  open: boolean;
}

export const DISPUTE_STATUS: Readonly<Record<DisputeStatus, DisputeStatusInfo>> = {
  OPEN: { label: 'Aberto', tone: 'waiting', open: true },
  UNDER_REVIEW: { label: 'Em análise', tone: 'progress', open: true },
  RESOLVED: { label: 'Resolvido', tone: 'done', open: false },
  REJECTED: { label: 'Encerrado', tone: 'neutral', open: false },
};

export function disputeStatus(status: string): DisputeStatusInfo {
  return Object.prototype.hasOwnProperty.call(DISPUTE_STATUS, status)
    ? DISPUTE_STATUS[status as DisputeStatus]
    : { label: 'Em análise', tone: 'neutral', open: false };
}

/**
 * Status do pedido em que a API aceita um caso novo
 * (`OrderDisputesController.open`): durante o atendimento ou depois dele,
 * antes de o cliente confirmar a conclusão.
 */
export const REPORTABLE_STATUSES: readonly string[] = ['EM_ANDAMENTO', 'AGUARDANDO_CONFIRMACAO_CLIENTE'];

/** Limites do `OpenDisputeDto` da API. */
export const REASON_MIN = 3;
export const REASON_MAX = 120;
export const DESCRIPTION_MIN = 10;
export const DESCRIPTION_MAX = 2000;

export interface ProblemDraft {
  reason: string;
  description: string;
}

/** Erros do formulário, com o texto que diz como corrigir; vazio quando a API aceita. */
export function validateProblem({ reason, description }: ProblemDraft): Partial<Record<keyof ProblemDraft, string>> {
  const errors: Partial<Record<keyof ProblemDraft, string>> = {};
  const r = reason.trim();
  const d = description.trim();
  if (!r) errors.reason = 'Informe o motivo.';
  else if (r.length < REASON_MIN) errors.reason = `Use pelo menos ${REASON_MIN} caracteres.`;
  else if (r.length > REASON_MAX) errors.reason = `Use até ${REASON_MAX} caracteres.`;
  if (!d) errors.description = 'Conte o que aconteceu.';
  else if (d.length < DESCRIPTION_MIN) errors.description = `Use pelo menos ${DESCRIPTION_MIN} caracteres.`;
  else if (d.length > DESCRIPTION_MAX) errors.description = `Use até ${DESCRIPTION_MAX.toLocaleString('pt-BR')} caracteres.`;
  return errors;
}

/** Por que o pedido não aceita um caso novo, pelo status (null: aceita). */
export function notReportableReason(status: string): { title: string; body: string } | null {
  if (REPORTABLE_STATUSES.includes(status)) return null;
  switch (status) {
    case 'AGUARDANDO_APROVACAO':
    case 'AGUARDANDO_PAGAMENTO':
    case 'AGENDADO':
    case 'EM_DESLOCAMENTO':
      return {
        title: 'O atendimento ainda não começou',
        body: 'Você pode reportar um problema a partir do início do atendimento. Antes disso, fale com o suporte.',
      };
    case 'CONCLUIDO':
      return {
        title: 'Este pedido já foi concluído',
        body: 'A conclusão já foi confirmada, então não dá para abrir um caso por aqui. Fale com o suporte.',
      };
    case 'DISPUTA':
      return {
        title: 'Este pedido já está em disputa',
        body: 'Nossa equipe está analisando o pedido. Fale com o suporte se precisar acrescentar algo.',
      };
    case 'CANCELADO':
    case 'REJEITADO':
      return {
        title: 'Este pedido foi encerrado',
        body: 'Pedidos cancelados ou recusados não aceitam problemas por aqui. Fale com o suporte.',
      };
    default:
      return {
        title: 'Este pedido não aceita problemas agora',
        body: 'Problemas podem ser reportados durante ou depois do atendimento, antes da confirmação. Fale com o suporte.',
      };
  }
}

/** E-mail de suporte de hoje (o mesmo de Detalhes do pedido). */
const SUPPORT_EMAIL = 'suporte@proxi.com.br';
const DAY = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' });
const TIME = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });

type LoadResult =
  | { ok: true; order: OrderDetails; disputes: OrderDispute[] }
  | { ok: false; notFound: boolean };

/**
 * Reportar problema (Etapa 10), em `/orders/:id/report-problem`: o cliente
 * ou o prestador abre um caso sobre o pedido, e acompanha os casos já
 * abertos. Endpoints: GET e POST /orders/:id/disputes (os de antes) e
 * GET /orders/:id, para saber se o pedido aceita um caso novo.
 */
@Component({
  selector: 'app-report-problem',
  imports: [
    FormsModule,
    RouterLink,
    TgAlertComponent,
    TgBadgeComponent,
    TgButtonComponent,
    TgCardComponent,
    TgEmptyStateComponent,
    TgFieldComponent,
    TgIconComponent,
    TgInputDirective,
    TgLoadingComponent,
    TgLoadingSkeletonDirective,
    TgSkeletonComponent,
  ],
  templateUrl: './report-problem.page.html',
  styleUrl: './report-problem.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportProblemPage implements OnInit {
  readonly #http = inject(HttpClient);
  readonly #orders = inject(Order);
  readonly #route = inject(ActivatedRoute);
  readonly #session = inject(UserLoggedService);
  readonly #destroyRef = inject(DestroyRef);

  readonly supportLink = `mailto:${SUPPORT_EMAIL}`;
  readonly reasonMax = REASON_MAX;
  readonly descriptionMax = DESCRIPTION_MAX;

  readonly id = signal('');
  readonly order = signal<OrderDetails | null>(null);
  readonly cases = signal<OrderDispute[]>([]);
  readonly loading = signal(true);
  /** Falha ao abrir: 'notFound' (404, inclusive pedido de outra pessoa) ou 'failed'. */
  readonly loadError = signal<'notFound' | 'failed' | null>(null);

  draft: ProblemDraft = { reason: '', description: '' };
  /** Comprimento da descrição, para o contador (o ngModel não é signal). */
  readonly descriptionLength = signal(0);
  readonly submitted = signal(false);
  readonly sending = signal(false);
  readonly sendError = signal('');
  readonly message = signal('');

  readonly openCase = computed(() => this.cases().find((item) => disputeStatus(item.status).open) ?? null);
  readonly blocked = computed(() => {
    const order = this.order();
    return order && !this.openCase() ? notReportableReason(order.status) : null;
  });
  readonly eyebrow = computed(() => {
    const title = this.order()?.service?.title?.trim();
    return [`Pedido #${this.id()}`, title].filter(Boolean).join(' · ');
  });

  readonly #loads = new Subject<string>();
  /** Muda a cada troca de pedido na rota: respostas de antes são ignoradas. */
  #generation = 0;

  constructor() {
    this.#loads
      .pipe(
        switchMap((id) => {
          this.loading.set(true);
          this.loadError.set(null);
          return forkJoin({
            order: this.#orders.getOrderDetails(id),
            disputes: this.#disputes(id),
          }).pipe(
            map(({ order, disputes }): LoadResult => ({ ok: true, order, disputes })),
            catchError((error: unknown) =>
              of<LoadResult>({ ok: false, notFound: error instanceof HttpErrorResponse && error.status === 404 }),
            ),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((result) => {
        this.loading.set(false);
        if (!result.ok) {
          this.order.set(null);
          this.cases.set([]);
          this.loadError.set(result.notFound ? 'notFound' : 'failed');
          return;
        }
        this.order.set(result.order);
        this.cases.set(result.disputes);
      });
  }

  ngOnInit(): void {
    this.#route.paramMap.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((params) => {
      const id = params.get('id') ?? '';
      if (this.#generation > 0 && id === this.id()) return;
      this.#generation++;
      this.id.set(id);
      this.order.set(null);
      this.cases.set([]);
      this.#resetForm();
      this.sending.set(false);
      this.message.set('');
      this.load();
    });
  }

  load(): void {
    this.#loads.next(this.id());
  }

  /** Erro do campo, só depois de tentar enviar. */
  error(field: keyof ProblemDraft): string {
    if (!this.submitted()) return '';
    return validateProblem(this.draft)[field] ?? '';
  }

  status(status: string): DisputeStatusInfo {
    return disputeStatus(status);
  }

  /** "Aberto por você", "pelo cliente" ou "pelo prestador". */
  openedBy(item: OrderDispute): string {
    const me = this.#session.user()?.user?.id;
    if (me !== undefined && item.openedById !== null && String(item.openedById) === String(me)) return 'por você';
    if (item.openedBy === 'CLIENTE') return 'pelo cliente';
    if (item.openedBy === 'PRESTADOR') return 'pelo prestador';
    return 'pela equipe';
  }

  /** "14/11/2026 às 12:20", no horário de São Paulo. */
  when(iso: string | null): string {
    if (!iso) return '';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    return `${DAY.format(date)} às ${TIME.format(date)}`;
  }

  submit(): void {
    if (this.sending() || this.openCase() || this.blocked()) return;
    this.submitted.set(true);
    this.sendError.set('');
    this.message.set('');
    const errors = validateProblem(this.draft);
    if (errors.reason || errors.description) return;

    const id = this.id();
    const generation = this.#generation;
    this.sending.set(true);
    this.#http
      .post<OrderDispute>(`${environment.url}/orders/${id}/disputes`, {
        reason: this.draft.reason.trim(),
        description: this.draft.description.trim(),
      })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (created) => {
          if (generation !== this.#generation) return;
          this.sending.set(false);
          // A API devolve o caso criado, ou o que já estava aberto.
          if (created?.id) this.cases.update((list) => [created, ...list.filter((item) => item.id !== created.id)]);
          this.#resetForm();
          this.message.set('Nossa equipe vai analisar e a resposta aparece nesta página.');
          this.#refreshCases(id, generation);
        },
        error: (error: unknown) => {
          if (generation !== this.#generation) return;
          this.sending.set(false);
          this.sendError.set(apiMessage(error) ?? 'Verifique sua conexão e tente de novo.');
        },
      });
  }

  #disputes(id: string) {
    return this.#http
      .get<OrderDispute[]>(`${environment.url}/orders/${id}/disputes`)
      .pipe(map((list) => (Array.isArray(list) ? list : [])));
  }

  /** Depois do envio, recarrega os casos sem tirar a tela; se falhar, fica o que a API devolveu. */
  #refreshCases(id: string, generation: number): void {
    this.#disputes(id)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (list) => {
          if (generation === this.#generation) this.cases.set(list);
        },
        error: () => undefined,
      });
  }

  #resetForm(): void {
    this.draft = { reason: '', description: '' };
    this.descriptionLength.set(0);
    this.submitted.set(false);
    this.sendError.set('');
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
