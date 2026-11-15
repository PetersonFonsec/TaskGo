import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  booleanAttribute,
  computed,
  input,
  output,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TgBadgeComponent } from '../badge/tg-badge.component';
import { TgButtonComponent } from '../button/tg-button.component';
import {
  type TgOrderPerspective,
  type TgOrderStatusAction,
  tgOrderNextStep,
  tgOrderStatus,
} from './tg-order-status';

/** Dados que a linha mostra. A tela monta a partir do pedido da API. */
export interface TgOrderRowData {
  id: string;
  /** Status do backend (OrderStatus). Desconhecido: "Em atualização". */
  status: string;
  /** Título do serviço. */
  service: string;
  /** A outra pessoa do pedido: o profissional para o cliente, o cliente para o prestador. */
  person?: string | null;
  /** Data e hora marcadas. Sem data válida: "Data a combinar". */
  scheduledFor?: string | number | Date | null;
  /** Só o bairro; o endereço completo fica na tela do pedido. */
  neighborhood?: string | null;
  /** Distância até o endereço (só para o prestador). */
  distanceKm?: number | null;
  /** Valor estimado do pedido, em reais (só para o prestador). */
  amount?: number | null;
  /** O cliente já avaliou (tira o "Avaliar"). */
  reviewed?: boolean | null;
}

const TIME = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const KM = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const BRL_INT = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

let nextId = 0;

/**
 * Lista de pedidos: a superfície com as divisórias entre as linhas.
 *
 *   <ul tgOrderList>
 *     @for (o of pedidos(); track o.id) {
 *       <li><tg-order-row perspective="customer" [order]="o" /></li>
 *     }
 *   </ul>
 */
@Component({
  selector: 'ul[tgOrderList]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'tg-order-list' },
  template: `<ng-content />`,
  styles: `
    .tg-order-list {
      margin: 0;
      padding: 0;
      list-style: none;
      overflow: hidden;
      border: 1px solid var(--tg-border-default);
      border-radius: var(--tg-radius-lg);
      background: var(--tg-bg-surface);
    }
    .tg-order-list > li {
      margin: 0;
      padding: 0;
    }
    .tg-order-list > li + li {
      border-top: 1px solid var(--tg-border-default);
    }
  `,
})
export class TgOrderListComponent {}

/**
 * Linha de pedido do Design System TaskGo (Etapa 8). Uma linha por pedido:
 * o serviço (link para o pedido, esticado sobre a linha), o status com o
 * mapa aprovado, a outra pessoa, a data e o bairro, e para o prestador a
 * distância e o valor. Quando é a vez de quem vê, um próximo passo.
 *
 *   <tg-order-row
 *     perspective="provider"
 *     [order]="o"
 *     [busy]="atualizando().has(o.id)"
 *     (statusAction)="avancar(o.id, $event)" />
 *
 * O status entra como descrição do link ("Instalação de chuveiro",
 * descrição "Profissional a caminho"). O botão leva o serviço como
 * descrição ("Pagar", descrição "Limpeza residencial"). Badge só com texto.
 * Abaixo de 480 px de largura do container, o botão desce.
 */
@Component({
  selector: 'tg-order-row',
  imports: [RouterLink, TgBadgeComponent, TgButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="tg-order-row">
      <div class="tg-order-row__main">
        <div class="tg-order-row__head">
          <a
            class="tg-order-row__link"
            [id]="titleId"
            [routerLink]="['/orders', order().id]"
            [attr.aria-describedby]="statusId"
            >{{ order().service }}</a
          >
          <tg-badge [id]="statusId" [tone]="status().tone">{{ status().label }}</tg-badge>
        </div>
        @if (meta(); as text) {
          <p class="tg-order-row__meta">{{ text }}</p>
        }
        @if (amount(); as value) {
          <p class="tg-order-row__amount">{{ value }}</p>
        }
      </div>

      @if (step(); as next) {
        <div class="tg-order-row__step">
          @if (next.link) {
            <a tgButton size="sm" class="tg-order-row__action" [routerLink]="next.link" [attr.aria-describedby]="titleId">{{
              next.label
            }}</a>
          } @else {
            <button
              tgButton
              type="button"
              size="sm"
              class="tg-order-row__action"
              [loading]="busy()"
              [attr.aria-describedby]="titleId"
              (click)="statusAction.emit(next.action)"
            >
              {{ next.label }}
            </button>
          }
        </div>
      }
    </div>
  `,
  styleUrl: './tg-order-row.component.scss',
})
export class TgOrderRowComponent {
  readonly order = input.required<TgOrderRowData>();
  /** Quem está vendo: muda o texto do status, a linha de apoio e o próximo passo. */
  readonly perspective = input.required<TgOrderPerspective>();
  /** A tela está trocando o status deste pedido: o botão fica em carregando. */
  readonly busy = input(false, { transform: booleanAttribute });

  /** Pedido de troca de status ("Estou a caminho", "Iniciar serviço"). A tela chama a API. */
  readonly statusAction = output<TgOrderStatusAction>();

  protected readonly titleId = `tg-order-row-title-${nextId}`;
  protected readonly statusId = `tg-order-row-status-${nextId++}`;

  protected readonly status = computed(() => tgOrderStatus(this.order().status, this.perspective()));
  protected readonly step = computed(() => tgOrderNextStep(this.order(), this.perspective()));

  protected readonly meta = computed(() => {
    const { person, scheduledFor, neighborhood, distanceKm } = this.order();
    const place = [neighborhood?.trim(), this.perspective() === 'provider' ? distance(distanceKm) : null]
      .filter(Boolean)
      .join(', ');
    return [person?.trim(), when(scheduledFor), place].filter(Boolean).join(' · ');
  });

  protected readonly amount = computed(() => {
    if (this.perspective() !== 'provider') return null;
    const raw = this.order().amount;
    const value = Number(raw);
    if (raw == null || !Number.isFinite(value) || value <= 0) return null;
    return (Number.isInteger(value) ? BRL_INT : BRL).format(value);
  });
}

function distance(km: number | null | undefined): string | null {
  const value = Number(km);
  if (km == null || !Number.isFinite(value) || value < 0) return null;
  return `${KM.format(value)} km`;
}

/** "Hoje, 14:00", "Amanhã, 09:00", "Ontem, 15:00", "Ter, 18 nov, 09:00" (com o ano se não for o atual). Sem data: "Data a combinar". */
export function when(value: string | number | Date | null | undefined, now = new Date()): string {
  if (value == null || value === '') return 'Data a combinar';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'Data a combinar';
  const days = Math.round((startOfDay(date) - startOfDay(now)) / 86_400_000);
  const time = TIME.format(date);
  if (days === 0) return `Hoje, ${time}`;
  if (days === 1) return `Amanhã, ${time}`;
  if (days === -1) return `Ontem, ${time}`;
  const year = date.getFullYear() === now.getFullYear() ? '' : ` ${date.getFullYear()}`;
  const day = String(date.getDate()).padStart(2, '0');
  return `${WEEKDAYS[date.getDay()]}, ${day} ${MONTHS[date.getMonth()]}${year}, ${time}`;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}
