import {
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  computed,
  input,
  linkedSignal,
  output,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TgBadgeComponent } from '../badge/tg-badge.component';
import { TgButtonComponent } from '../button/tg-button.component';
import { TgCardComponent, TgCardLinkDirective } from '../card/tg-card.component';
import { TgIconComponent } from '../icon/tg-icon.component';
import { tgIds } from '../tg-id';
import { TG_NO_DATE, tgDistance, tgMoney, tgWhenParts } from '../order-row/tg-order-format';
import {
  type TgOrderPerspective,
  type TgOrderStatusAction,
  tgOrderNextStep,
  tgOrderStatus,
  tgOrderStatusIcon,
} from '../order-row/tg-order-status';

/** Dados que o card mostra. A tela monta a partir do pedido da API. */
export interface TgAppointmentData {
  id: string;
  /** Status do backend (OrderStatus). Desconhecido: "Em atualização", sem ícone. */
  status: string;
  /** Título do serviço. */
  service: string;
  /** A outra pessoa: o profissional para o cliente, o cliente para o prestador. */
  person?: string | null;
  /** Foto da outra pessoa. Sem foto, ou se falhar, as iniciais. */
  personPhotoUrl?: string | null;
  /** Data e hora marcadas. Sem data válida: "Data a combinar". */
  scheduledFor?: string | number | Date | null;
  /** Rua, número e complemento ("Rua Harmonia, 123, apto 41"). */
  address?: string | null;
  neighborhood?: string | null;
  /** Distância até o endereço (só para o prestador). */
  distanceKm?: number | null;
  /** Valor estimado, em reais (só para o prestador). */
  amount?: number | null;
  /** O cliente já avaliou (tira o "Avaliar"). Da API: `review` presente. */
  reviewed?: boolean | null;
  /** Status do pagamento (`payment.status`): "Pagar" ou "Ver QR Code", como na linha de pedido. */
  paymentStatus?: string | null;
}

export type TgAppointmentHeadingLevel = 2 | 3 | 4 | 5 | 6;

/**
 * Card de agendamento do Design System TaskGo (Etapa 8), sobre o `tg-card`.
 * O próximo serviço em destaque: quando, o status (o único lugar em que o
 * badge de status leva ícone), o serviço, a outra pessoa, o endereço
 * completo e, quando é a vez de quem vê, o próximo passo. Mesmo mapa de
 * status e mesmo próximo passo da linha de pedido.
 *
 *   <tg-appointment-card
 *     perspective="provider"
 *     [order]="proximo()"
 *     [busy]="atualizando()"
 *     (statusAction)="avancar($event)" />
 *
 * A tela escolhe qual pedido destacar. O serviço é o link para o pedido
 * (tgCardLink, esticado sobre o card), com o status e a data como
 * descrição; o botão fica por cima. O título é h3 por padrão. Abaixo de
 * 480 px de largura do container, o status desce e o botão ocupa a largura.
 */
@Component({
  selector: 'tg-appointment-card',
  imports: [RouterLink, TgCardComponent, TgCardLinkDirective, TgBadgeComponent, TgButtonComponent, TgIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <tg-card class="tg-appointment-card__card">
      <div class="tg-appointment-card__top">
        <p class="tg-appointment-card__when" [id]="whenId">
          @if (whenParts(); as w) {
            <span class="tg-appointment-card__day">{{ w.day }}</span>{{ ' ' }}
            <span class="tg-appointment-card__time">{{ w.time }}</span>
          } @else {
            <span class="tg-appointment-card__day">{{ noDate }}</span>
          }
        </p>
        <tg-badge [id]="statusId" [tone]="status().tone" [icon]="statusIcon() ?? undefined">{{ status().label }}</tg-badge>
      </div>

      @switch (headingLevel()) {
        @case (2) {
          <h2 class="tg-appointment-card__title">
            <a tgCardLink [id]="titleId" [routerLink]="['/orders', order().id]" [attr.aria-describedby]="describedBy">{{ order().service }}</a>
          </h2>
        }
        @case (4) {
          <h4 class="tg-appointment-card__title">
            <a tgCardLink [id]="titleId" [routerLink]="['/orders', order().id]" [attr.aria-describedby]="describedBy">{{ order().service }}</a>
          </h4>
        }
        @case (5) {
          <h5 class="tg-appointment-card__title">
            <a tgCardLink [id]="titleId" [routerLink]="['/orders', order().id]" [attr.aria-describedby]="describedBy">{{ order().service }}</a>
          </h5>
        }
        @case (6) {
          <h6 class="tg-appointment-card__title">
            <a tgCardLink [id]="titleId" [routerLink]="['/orders', order().id]" [attr.aria-describedby]="describedBy">{{ order().service }}</a>
          </h6>
        }
        @default {
          <h3 class="tg-appointment-card__title">
            <a tgCardLink [id]="titleId" [routerLink]="['/orders', order().id]" [attr.aria-describedby]="describedBy">{{ order().service }}</a>
          </h3>
        }
      }

      @if (person(); as name) {
        <p class="tg-appointment-card__person">
          <span class="tg-appointment-card__avatar">
            @if (photo(); as src) {
              <img [src]="src" alt="" loading="lazy" decoding="async" (error)="photoFailed.set(true)" />
            } @else {
              <span aria-hidden="true">{{ initials() }}</span>
            }
          </span>
          {{ name }}
        </p>
      }

      @if (place(); as text) {
        <p class="tg-appointment-card__place">
          <tg-icon name="map-pin" [size]="20" />
          <span>{{ text }}</span>
        </p>
      }

      @if (amount(); as value) {
        <p class="tg-appointment-card__amount">Valor estimado{{ ' ' }}<b>{{ value }}</b></p>
      }

      @if (step(); as next) {
        <div class="tg-appointment-card__step">
          @if (next.link) {
            <a tgButton class="tg-appointment-card__action" [routerLink]="next.link" [attr.aria-describedby]="titleId">{{
              next.label
            }}</a>
          } @else {
            <button
              tgButton
              type="button"
              class="tg-appointment-card__action"
              [loading]="busy()"
              [attr.aria-describedby]="titleId"
              (click)="statusAction.emit(next.action)"
            >
              {{ next.label }}
            </button>
          }
        </div>
      }
    </tg-card>
  `,
  styleUrl: './tg-appointment-card.component.scss',
})
export class TgAppointmentCardComponent {
  readonly order = input.required<TgAppointmentData>();
  /** Quem está vendo: muda o texto do status, a distância, o valor e o próximo passo. */
  readonly perspective = input.required<TgOrderPerspective>();
  /** A tela está trocando o status: o botão fica em carregando. */
  readonly busy = input(false, { transform: booleanAttribute });
  /** Nível do título: inteiro de 2 a 6; outro valor vira h3. */
  readonly headingLevel = input(3, { transform: toHeadingLevel });

  /** Pedido de troca de status ("Estou a caminho", "Iniciar serviço"). A tela chama a API. */
  readonly statusAction = output<TgOrderStatusAction>();

  // Ids por aplicação (estáveis no SSR com hidratação), não por pedido.
  readonly #ids = tgIds('tg-appointment-card');
  protected readonly titleId = this.#ids('title');
  protected readonly statusId = this.#ids('status');
  protected readonly whenId = this.#ids('when');
  protected readonly describedBy = `${this.statusId} ${this.whenId}`;
  protected readonly noDate = TG_NO_DATE;

  protected readonly status = computed(() => tgOrderStatus(this.order().status, this.perspective()));
  protected readonly statusIcon = computed(() => tgOrderStatusIcon(this.order().status));
  protected readonly step = computed(() => tgOrderNextStep(this.order(), this.perspective()));
  protected readonly whenParts = computed(() => tgWhenParts(this.order().scheduledFor));

  protected readonly person = computed(() => this.order().person?.trim() || null);

  /** Volta a tentar a foto quando a URL muda. */
  protected readonly photoFailed = linkedSignal({
    source: () => this.order().personPhotoUrl,
    computation: () => false,
  });

  protected readonly photo = computed(() => {
    const url = this.order().personPhotoUrl?.trim();
    return url && !this.photoFailed() ? url : null;
  });

  protected readonly initials = computed(() => {
    const words = (this.person() ?? '').split(/\s+/).filter(Boolean);
    if (!words.length) return '?';
    const last = words.length > 1 ? words[words.length - 1][0] : '';
    return (words[0][0] + last).toLocaleUpperCase('pt-BR');
  });

  protected readonly place = computed(() => {
    const { address, neighborhood, distanceKm } = this.order();
    const where = [address?.trim(), neighborhood?.trim()].filter(Boolean).join(' · ');
    const km = this.perspective() === 'provider' ? tgDistance(distanceKm) : null;
    return [where, km].filter(Boolean).join(', ') || null;
  });

  protected readonly amount = computed(() =>
    this.perspective() === 'provider' ? tgMoney(this.order().amount) : null,
  );
}

function toHeadingLevel(value: unknown): TgAppointmentHeadingLevel {
  const n = Number(value);
  return Number.isInteger(n) && n >= 2 && n <= 6 ? (n as TgAppointmentHeadingLevel) : 3;
}
