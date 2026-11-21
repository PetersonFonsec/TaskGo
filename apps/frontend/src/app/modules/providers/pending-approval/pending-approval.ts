import { HttpErrorResponse } from '@angular/common/http';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, EMPTY, map, Observable, of, Subject, type Subscription, switchMap, timer } from 'rxjs';

import { orderExpiryNotice } from '@modules/orders/order-details/order-details.view';
import { TgButtonComponent } from '@shared/design-system/button/tg-button.component';
import { TgCardComponent } from '@shared/design-system/card/tg-card.component';
import { TgDialogComponent } from '@shared/design-system/dialog/tg-dialog.component';
import { TgAlertComponent, type TgFeedbackTone } from '@shared/design-system/feedback/tg-alert.component';
import { TgFieldComponent } from '@shared/design-system/field/tg-field.component';
import { TgInputDirective } from '@shared/design-system/field/tg-input.directive';
import { TgIconComponent } from '@shared/design-system/icon/tg-icon.component';
import {
  TgLoadingComponent,
  TgLoadingSkeletonDirective,
} from '@shared/design-system/skeleton/tg-loading.component';
import { TgSkeletonComponent } from '@shared/design-system/skeleton/tg-skeleton.component';
import { Order } from '@shared/service/order/order';
import { OrderCancellationReason, OrderDetails } from '@shared/service/order/order.model';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';

/** Os motivos do enum `OrderCancellationReason` do backend, com o texto da tela. */
export const DECLINE_REASONS: { value: OrderCancellationReason; label: string }[] = [
  { value: 'NO_AVAILABILITY', label: 'Sem horário disponível' },
  { value: 'OUT_OF_AREA', label: 'Fora da minha área de atendimento' },
  { value: 'SERVICE_NOT_OFFERED', label: 'Não faço esse serviço' },
  { value: 'OTHER', label: 'Outro motivo' },
];

/** `@MaxLength(500)` de `CancelOrderByProviderDto.note`. */
export const DECLINE_NOTE_MAX = 500;

/** Como a solicitação terminou, para o aviso que substitui as ações. */
export interface PendingApprovalOutcome {
  tone: TgFeedbackTone;
  title: string;
  body: string;
  reason?: string;
  note?: string | null;
}

/**
 * Status (`OrderStatus` do backend) a que o pedido só chega depois do aceite
 * do prestador: `confirm-order-by-provider` leva de AGUARDANDO_APROVACAO para
 * AGUARDANDO_PAGAMENTO, e o fluxo segue daí. A disputa só abre com o serviço
 * em andamento ou à espera de confirmação.
 */
const ACCEPTED_STATUSES: readonly string[] = [
  'AGUARDANDO_PAGAMENTO',
  'AGENDADO',
  'EM_DESLOCAMENTO',
  'EM_ANDAMENTO',
  'AGUARDANDO_CONFIRMACAO_CLIENTE',
  'CONCLUIDO',
  'DISPUTA',
];

/**
 * O desfecho de uma solicitação que já não aguarda resposta, pelo que a API
 * manda (`get-order-details.handler.ts`): a expiração automática cancela o
 * pedido e registra o evento EXPIRED na linha do tempo; a recusa cancela com
 * o motivo em `cancellation`; o aceite leva o pedido a um dos
 * `ACCEPTED_STATUSES`. Status fora dessas listas não afirma nada: só diz que
 * a solicitação não aguarda resposta e aponta os detalhes.
 */
export function pendingApprovalOutcome(order: OrderDetails): PendingApprovalOutcome | null {
  if (order.status === 'AGUARDANDO_APROVACAO') return null;
  if (order.status === 'CANCELADO' || order.status === 'REJEITADO') {
    const timeline = Array.isArray(order.timeline) ? order.timeline : [];
    if (timeline.some((event) => event.type === 'EXPIRED')) {
      return {
        tone: 'warning',
        title: 'Esta solicitação expirou',
        body: 'O prazo para responder terminou e o horário foi liberado para o cliente.',
      };
    }
    if (order.cancellation?.label) {
      return {
        tone: 'info',
        title: 'Você recusou esta solicitação',
        body: 'O cliente vê o motivo nos detalhes do pedido.',
        reason: order.cancellation.label,
        note: order.cancellation.note?.trim() || null,
      };
    }
    return {
      tone: 'info',
      title: 'Esta solicitação foi cancelada',
      body: 'Ela não pode mais ser respondida.',
    };
  }
  if (ACCEPTED_STATUSES.includes(order.status)) {
    return {
      tone: 'success',
      title: 'Você aceitou esta solicitação',
      body: 'Acompanhe os próximos passos nos detalhes do pedido.',
    };
  }
  return {
    tone: 'info',
    title: 'Esta solicitação não aguarda mais resposta',
    body: 'Veja a situação atual nos detalhes do pedido.',
  };
}

/** Maior espera que um timer do navegador aceita (setTimeout, ~24,8 dias). */
const MAX_TIMER_MS = 2_147_483_647;

const MONEY = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const PERCENT = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1 });
const KM = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
const DAY = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  timeZone: 'America/Sao_Paulo',
});
const TIME = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Sao_Paulo',
});

const validDate = (value: string | null | undefined): Date | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export interface PendingApprovalError {
  /** De onde veio: o aceite mostra na tela; a recusa, dentro do diálogo. */
  kind: 'accept' | 'decline';
  title: string;
  body: string;
  /** A API recusou porque a solicitação já não aguarda resposta: oferece "Atualizar". */
  stale: boolean;
}

type LoadResult = { ok: true; order: OrderDetails } | { ok: false; notFound: boolean };

/**
 * Responder solicitação (Etapa 10), em `/provider/:orderId/aprovacao`: o
 * prestador vê quando, onde e quanto recebe, e aceita ou recusa. A recusa
 * cancela o pedido e não se desfaz, por isso pede o motivo num `tg-dialog`.
 * Endpoints de antes: GET /orders/:id, POST /order/:id/provider/:providerId/confirm
 * e POST .../cancel com `{ reason, note? }`.
 */
@Component({
  selector: 'app-pending-approval',
  imports: [
    RouterLink,
    TgAlertComponent,
    TgButtonComponent,
    TgCardComponent,
    TgDialogComponent,
    TgFieldComponent,
    TgIconComponent,
    TgInputDirective,
    TgLoadingComponent,
    TgLoadingSkeletonDirective,
    TgSkeletonComponent,
  ],
  templateUrl: './pending-approval.html',
  styleUrl: './pending-approval.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PendingApproval implements OnInit {
  readonly #route = inject(ActivatedRoute);
  readonly #session = inject(UserLoggedService);
  readonly #announcer = inject(LiveAnnouncer);
  readonly #orders = inject(Order);
  readonly #destroyRef = inject(DestroyRef);

  readonly reasons = DECLINE_REASONS;
  readonly noteMaxLength = DECLINE_NOTE_MAX;

  readonly order = signal<OrderDetails | null>(null);
  readonly loading = signal(true);
  /** Falha ao abrir: 'notFound' (404) ou 'failed'. */
  readonly loadError = signal<'notFound' | 'failed' | null>(null);
  /** Qual resposta está sendo enviada; uma por vez. */
  readonly submitting = signal<'accept' | 'decline' | null>(null);
  /** Falha ao aceitar (na tela) ou ao recusar (no diálogo). */
  readonly actionError = signal<PendingApprovalError | null>(null);
  readonly acceptError = computed(() => (this.actionError()?.kind === 'accept' ? this.actionError() : null));
  readonly declineError = computed(() => (this.actionError()?.kind === 'decline' ? this.actionError() : null));
  /** A resposta que acabou de dar certo; substitui as ações. */
  readonly answered = signal<PendingApprovalOutcome | null>(null);

  readonly reason = signal<OrderCancellationReason | null>(null);
  readonly reasonError = signal('');
  readonly note = signal('');
  /**
   * Hora de referência de "recebida há" e do prazo: renovada a cada carga e,
   * com a solicitação aguardando resposta, no instante em que o prazo termina.
   */
  readonly now = signal(new Date());

  readonly declineDialog = viewChild.required<TgDialogComponent>('declineDialog');

  readonly awaitingApproval = computed(
    () => this.order()?.status === 'AGUARDANDO_APROVACAO' && !this.answered(),
  );
  readonly outcome = computed(() => {
    const order = this.order();
    return this.answered() ?? (order ? pendingApprovalOutcome(order) : null);
  });
  readonly expiry = computed(() => {
    const order = this.order();
    return order && this.awaitingApproval() ? orderExpiryNotice(order, 'provider', this.now()) : null;
  });
  readonly serviceAmount = computed(() => {
    const order = this.order();
    return order?.providerEarnings?.grossAmount ?? order?.service.estimatedPrice ?? 0;
  });

  #orderId = '';
  /** Abrir a recusa assim que a solicitação carregar (`?recusar` no link). */
  #declineOnLoad = false;
  /** Pedido para o qual o diálogo de recusa foi aberto. */
  #declineFor: string | null = null;
  /** Resposta (aceite ou recusa) em curso, ligada ao pedido que a enviou. */
  #response: Subscription | null = null;
  readonly #loads = new Subject<void>();

  /**
   * Quando o prazo da solicitação aguardando resposta termina, em ms; nulo
   * sem prazo, já vencido ou longe demais para um timer.
   */
  readonly #deadline = computed(() => {
    const order = this.order();
    if (!order || !this.awaitingApproval()) return null;
    const expires = validDate(order.expiresAt)?.getTime() ?? null;
    if (expires === null) return null;
    const wait = expires - this.now().getTime();
    return wait > 0 && wait <= MAX_TIMER_MS ? expires : null;
  });

  constructor() {
    // Um timer por prazo: renova `now` quando o prazo termina, para o aviso
    // passar a "O prazo terminou" sem recarregar. Não consulta a API: quem
    // diz se o pedido expirou é a próxima carga. Trocar de pedido, responder
    // ou destruir a tela cancela o timer (switchMap / takeUntilDestroyed).
    toObservable(this.#deadline)
      .pipe(
        switchMap((deadline) => (deadline === null ? EMPTY : timer(Math.max(0, deadline - Date.now())))),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(() => this.now.set(new Date()));

    this.#loads
      .pipe(
        switchMap(() => {
          this.loading.set(true);
          this.loadError.set(null);
          return this.#orders.getOrderDetails(this.#orderId).pipe(
            map((order): LoadResult => ({ ok: true, order })),
            catchError((error: unknown) =>
              of<LoadResult>({
                ok: false,
                notFound: error instanceof HttpErrorResponse && error.status === 404,
              }),
            ),
          );
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe((result) => {
        this.loading.set(false);
        this.now.set(new Date());
        if (!result.ok) {
          this.order.set(null);
          this.loadError.set(result.notFound ? 'notFound' : 'failed');
          return;
        }
        this.order.set(result.order);
        if (this.#declineOnLoad && this.awaitingApproval()) {
          this.#declineOnLoad = false;
          this.openDecline();
        }
      });
  }

  ngOnInit(): void {
    this.#declineOnLoad = this.#route.snapshot.queryParamMap.has('recusar');
    this.#route.params.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((params) => {
      const orderId = String(params['orderId'] ?? '');
      if (this.#orderId && orderId !== this.#orderId) {
        this.#leaveOrder();
        this.#declineOnLoad = this.#route.snapshot.queryParamMap.has('recusar');
      }
      this.#orderId = orderId;
      this.order.set(null);
      this.answered.set(null);
      this.actionError.set(null);
      this.load();
    });
  }

  /** Abre (ou, no "Tentar de novo" e no "Atualizar", reabre) a solicitação. */
  load(): void {
    this.actionError.set(null);
    this.#loads.next();
  }

  accept(): void {
    if (!this.awaitingApproval()) return;
    this.#respond(
      'accept',
      this.#orders.confirmOrder(this.#orderId, this.#providerId()),
      {
        tone: 'success',
        title: 'Solicitação aceita',
        body: 'O cliente foi avisado e já pode seguir para o pagamento.',
      },
    );
  }

  openDecline(): void {
    if (this.submitting() || !this.awaitingApproval()) return;
    this.actionError.set(null);
    this.#clearDecline();
    this.#declineFor = this.#orderId;
    this.declineDialog().open();
  }

  closeDecline(): void {
    this.declineDialog().close();
  }

  /** "Atualizar" depois de uma resposta recusada pela API: fecha a recusa e recarrega. */
  refresh(): void {
    if (this.declineDialog().isOpen()) this.closeDecline();
    this.load();
  }

  chooseReason(value: OrderCancellationReason): void {
    this.reason.set(value);
    this.reasonError.set('');
  }

  onNoteInput(event: Event): void {
    const target = event.target;
    if (target instanceof HTMLTextAreaElement) this.note.set(target.value);
  }

  decline(): void {
    // A recusa vale só para o pedido em que o diálogo foi aberto, se ele ainda aguarda resposta.
    if (this.#declineFor !== this.#orderId || !this.awaitingApproval()) return;
    const reason = this.reason();
    if (!reason) {
      this.reasonError.set('Escolha o motivo da recusa.');
      return;
    }
    const note = reason === 'OTHER' ? this.note().trim() : '';
    this.#respond(
      'decline',
      this.#orders.cancelOrder(this.#orderId, this.#providerId(), {
        reason,
        ...(note ? { note } : {}),
      }),
      {
        tone: 'info',
        title: 'Solicitação recusada',
        body: 'O cliente vê o motivo nos detalhes do pedido.',
        reason: DECLINE_REASONS.find((item) => item.value === reason)?.label,
        note: note || null,
      },
    );
  }

  /** "Quinta-feira, 03 de outubro", no horário de São Paulo. */
  formatDate(value: string | null | undefined): string {
    const date = validDate(value);
    if (!date) return 'A combinar';
    const text = DAY.format(date);
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  /** "10:00 às 12:00", no horário de São Paulo. */
  formatTimeRange(start: string | null | undefined, end: string | null | undefined): string {
    const from = validDate(start);
    if (!from) return 'A combinar';
    const to = validDate(end);
    return to ? `${TIME.format(from)} às ${TIME.format(to)}` : TIME.format(from);
  }

  formatMoney(value: number): string {
    return MONEY.format(value);
  }

  formatPercent(value: number): string {
    return PERCENT.format(value);
  }

  formatDistance(km: number): string {
    return `${KM.format(km)} km`;
  }

  receivedAgo(value: string | null | undefined): string {
    const date = validDate(value);
    if (!date) return '';
    const minutes = Math.max(0, Math.floor((this.now().getTime() - date.getTime()) / 60000));
    if (minutes < 1) return 'agora mesmo';
    if (minutes < 60) return `há ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `há ${hours} h`;
    const days = Math.floor(hours / 24);
    return days === 1 ? 'há 1 dia' : `há ${days} dias`;
  }

  streetLine(order: OrderDetails): string {
    const address = order.address;
    const line = address
      ? [address.street, address.number, address.complement].filter(Boolean).join(', ')
      : '';
    return line || 'Endereço não informado';
  }

  regionLine(order: OrderDetails): string {
    const address = order.address;
    if (!address) return '';
    const city = [address.city, address.state].filter(Boolean).join('/');
    return [address.neighborhood, city, address.cep ? `CEP ${address.cep}` : null]
      .filter(Boolean)
      .join(' · ');
  }

  #providerId(): string {
    return String(this.#session.user()?.user?.id ?? '');
  }

  /**
   * Saiu do pedido (outro `orderId` na mesma tela): para de ouvir a resposta
   * em curso, fecha a recusa e esquece o que foi preenchido nela. Parar de
   * ouvir não desfaz nada no backend; ao voltar, a carga mostra como ficou.
   */
  #leaveOrder(): void {
    this.#response?.unsubscribe();
    this.#response = null;
    this.submitting.set(null);
    if (this.declineDialog().isOpen()) this.closeDecline();
    this.#clearDecline();
    this.#declineFor = null;
  }

  #clearDecline(): void {
    this.reason.set(null);
    this.reasonError.set('');
    this.note.set('');
  }

  #respond(
    kind: 'accept' | 'decline',
    request: Observable<unknown>,
    success: PendingApprovalOutcome,
  ): void {
    if (this.submitting()) return;
    this.actionError.set(null);
    this.submitting.set(kind);
    const orderId = this.#orderId;
    const response = request.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe({
      next: () => {
        // A tela já mostra outro pedido: esta resposta não mexe nele.
        if (orderId !== this.#orderId) return;
        this.#response = null;
        this.submitting.set(null);
        this.answered.set(success);
        if (kind === 'decline') this.declineDialog().close();
        this.#announcer.announce(success.title);
      },
      error: (error: unknown) => {
        if (orderId !== this.#orderId) return;
        this.#response = null;
        this.submitting.set(null);
        const status = error instanceof HttpErrorResponse ? error.status : 0;
        // 400: o pedido já saiu de "aguardando aprovação" (aceito, recusado ou expirado).
        const stale = status === 400 || status === 409;
        this.actionError.set(
          stale
            ? {
                title: 'Esta solicitação não pode mais ser respondida',
                body: 'Ela pode ter expirado ou já ter sido respondida. Atualize para ver como ficou.',
                stale,
                kind,
              }
            : {
                title: 'Não foi possível enviar sua resposta',
                body: 'Verifique sua conexão e tente de novo.',
                stale,
                kind,
              },
        );
      },
    });
    // Uma resposta síncrona já terminou acima; só guarda a que segue em curso.
    if (!response.closed) this.#response = response;
  }
}
