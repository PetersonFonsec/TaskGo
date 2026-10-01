import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { finalize, Observable, switchMap, tap } from 'rxjs';

import { ButtonComponent } from '@shared/components/ui/button/button.component';
import { FullModal } from '@shared/components/ui/full-modal/full-modal';
import { Order } from '@shared/service/order/order';
import { OrderCancellationReason, OrderDetails } from '@shared/service/order/order.model';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import { Utils } from '@shared/service/utils/utils.service';

export const DECLINE_REASONS: { value: OrderCancellationReason; label: string }[] = [
  { value: 'NO_AVAILABILITY', label: 'Sem horário disponível' },
  { value: 'OUT_OF_AREA', label: 'Fora da minha área de atendimento' },
  { value: 'SERVICE_NOT_OFFERED', label: 'Não faço esse serviço' },
  { value: 'OTHER', label: 'Outro motivo' },
];

@Component({
  selector: 'app-pending-approval',
  imports: [ButtonComponent, FullModal, RouterLink],
  templateUrl: './pending-approval.html',
  styleUrl: './pending-approval.scss',
})
export class PendingApproval implements OnInit {
  #activatedRoute = inject(ActivatedRoute);
  #userLogged = inject(UserLoggedService);
  #liveAnnouncer = inject(LiveAnnouncer);
  #router = inject(Router);
  #order = inject(Order);

  readonly reasons = DECLINE_REASONS;
  readonly noteMaxLength = 500;

  order = signal<OrderDetails | null>(null);
  loading = signal(true);
  loadError = signal('');
  actionError = signal('');
  submitting = signal(false);
  declining = signal(false);
  reason = signal<OrderCancellationReason | null>(null);
  note = signal('');
  showModal = signal(false);
  modalTitle = signal('');
  modalMessage = signal('');
  orderId = signal('');
  now = signal(Date.now());

  awaitingApproval = computed(() => this.order()?.status === 'AGUARDANDO_APROVACAO');
  serviceAmount = computed(() => {
    const order = this.order();
    return order?.providerEarnings?.grossAmount ?? order?.service.estimatedPrice ?? 0;
  });

  ngOnInit(): void {
    this.declining.set(this.#activatedRoute.snapshot.queryParamMap.has('recusar'));
    this.#activatedRoute.params
      .pipe(
        tap(({ orderId }) => this.orderId.set(orderId)),
        switchMap(() => this.fetch()),
      )
      .subscribe({
        next: (order) => this.onLoaded(order),
        error: (error) => this.onLoadError(error),
      });
  }

  load(): void {
    this.fetch().subscribe({
      next: (order) => this.onLoaded(order),
      error: (error) => this.onLoadError(error),
    });
  }

  confirm(): void {
    this.respond(
      this.#order.confirmOrder(this.orderId(), this.providerId()),
      'Solicitação aceita',
      'O cliente foi avisado e já pode seguir para o pagamento.',
    );
  }

  openDecline(): void {
    this.actionError.set('');
    this.declining.set(true);
  }

  closeDecline(): void {
    this.declining.set(false);
    this.reason.set(null);
    this.note.set('');
  }

  decline(): void {
    const reason = this.reason();
    if (!reason) {
      this.actionError.set('Escolha o motivo da recusa.');
      return;
    }
    const note = this.note().trim();
    this.respond(
      this.#order.cancelOrder(this.orderId(), this.providerId(), {
        reason,
        ...(note ? { note } : {}),
      }),
      'Solicitação recusada',
      'O cliente verá o motivo informado nos detalhes do pedido.',
    );
  }

  onNoteInput(event: Event): void {
    this.note.set((event.target as HTMLTextAreaElement).value);
  }

  goToHome(): void {
    const user = this.#userLogged.user().user;
    this.#router.navigateByUrl(Utils.getRouteByRole(user.type));
  }

  formatDate(value: string | null | undefined): string {
    return value
      ? new Intl.DateTimeFormat('pt-BR', {
          weekday: 'long',
          day: '2-digit',
          month: 'long',
        }).format(new Date(value))
      : 'A combinar';
  }

  formatTimeRange(start: string | null | undefined, end: string | null | undefined): string {
    if (!start) return 'A combinar';
    const time = (value: string) =>
      new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(
        new Date(value),
      );
    return end ? `${time(start)} às ${time(end)}` : time(start);
  }

  formatMoney(value: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }

  formatPercent(value: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1 }).format(
      value,
    );
  }

  formatDistance(km: number): string {
    return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(km)} km`;
  }

  receivedAgo(value: string | null | undefined): string {
    if (!value) return '';
    const minutes = Math.max(0, Math.floor((this.now() - new Date(value).getTime()) / 60000));
    if (minutes < 1) return 'agora mesmo';
    if (minutes < 60) return `há ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `há ${hours} h`;
    const days = Math.floor(hours / 24);
    return days === 1 ? 'há 1 dia' : `há ${days} dias`;
  }

  streetLine(order: OrderDetails): string {
    const address = order.address;
    if (!address) return 'Endereço não informado';
    return (
      [address.street, address.number, address.complement].filter(Boolean).join(', ') ||
      'Endereço não informado'
    );
  }

  regionLine(order: OrderDetails): string {
    const address = order.address;
    if (!address) return '';
    const city = [address.city, address.state].filter(Boolean).join('/');
    return [address.neighborhood, city, address.cep ? `CEP ${address.cep}` : null]
      .filter(Boolean)
      .join(' · ');
  }

  private fetch(): Observable<OrderDetails> {
    this.loading.set(true);
    this.loadError.set('');
    return this.#order
      .getOrderDetails(this.orderId())
      .pipe(finalize(() => this.loading.set(false)));
  }

  private onLoaded(order: OrderDetails): void {
    this.now.set(Date.now());
    this.order.set(order);
  }

  private onLoadError(error: HttpErrorResponse): void {
    this.loadError.set(
      error?.status === 404
        ? 'Esta solicitação não foi encontrada.'
        : 'Não foi possível carregar a solicitação. Tente novamente.',
    );
  }

  private providerId(): string {
    return String(this.#userLogged.user()?.user?.id ?? '');
  }

  private respond(request: Observable<unknown>, title: string, message: string): void {
    if (this.submitting()) return;
    this.actionError.set('');
    this.submitting.set(true);
    request.pipe(finalize(() => this.submitting.set(false))).subscribe({
      next: () => {
        this.#liveAnnouncer.announce(title);
        this.modalTitle.set(title);
        this.modalMessage.set(message);
        this.showModal.set(true);
      },
      error: (error: HttpErrorResponse) =>
        this.actionError.set(
          error?.status === 400 || error?.status === 409
            ? 'Esta solicitação não pode mais ser respondida. Atualize a página.'
            : 'Não foi possível enviar sua resposta. Tente novamente.',
        ),
    });
  }
}
