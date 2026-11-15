import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
  output,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TgBadgeComponent } from '../badge/tg-badge.component';
import { TgCardComponent, TgCardLinkDirective } from '../card/tg-card.component';
import { TgIconComponent } from '../icon/tg-icon.component';
import type { TgProvider } from './tg-provider';

export type TgProviderCardHeadingLevel = 2 | 3 | 4 | 5 | 6;

const PRICE = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const PRICE_INT = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});
const ONE_DECIMAL = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const COUNT = new Intl.NumberFormat('pt-BR');

/**
 * Card de prestador do Design System TaskGo (Etapa 8), sobre o `tg-card`.
 * O cliente compara profissionais numa lista: quem é, se é verificado, a
 * nota, a distância, o serviço e o preço inicial. Só mostra dados reais; o
 * que não vier some do card.
 *
 *   <tg-provider-card
 *     [provider]="p"
 *     [link]="['/customer', p.id]"           (perfil público: /customer/:id, id do Provider)
 *     [favorite]="favoritos()[p.id]"      (opcional; sem ele, sem coração)
 *     (favoriteChange)="alternar(p.id, $event)" />
 *
 * O nome é o link (tgCardLink, dentro do tg-card para achar o card pela injeção) e se estica sobre o card; o coração fica por
 * cima. O título é h3 por padrão (`headingLevel`, inteiro de 2 a 6). A foto
 * é decorativa (alt vazio), porque o nome está ao lado; sem foto, ou se ela
 * falhar, aparecem as iniciais. Abaixo de 480 px de largura do container, a
 * foto diminui e o preço desce.
 */
@Component({
  selector: 'tg-provider-card',
  imports: [RouterLink, TgCardComponent, TgCardLinkDirective, TgBadgeComponent, TgIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <tg-card class="tg-provider-card__card">
      <span class="tg-provider-card__photo">
        @if (photo(); as src) {
          <img [src]="src" alt="" loading="lazy" decoding="async" (error)="photoFailed.set(true)" />
        } @else {
          <span aria-hidden="true">{{ initials() }}</span>
        }
      </span>

      <div class="tg-provider-card__info">
        <div class="tg-provider-card__title">
          @switch (headingLevel()) {
            @case (2) {
              <h2 class="tg-provider-card__name"><a tgCardLink [routerLink]="link()">{{ provider().name }}</a></h2>
            }
            @case (4) {
              <h4 class="tg-provider-card__name"><a tgCardLink [routerLink]="link()">{{ provider().name }}</a></h4>
            }
            @case (5) {
              <h5 class="tg-provider-card__name"><a tgCardLink [routerLink]="link()">{{ provider().name }}</a></h5>
            }
            @case (6) {
              <h6 class="tg-provider-card__name"><a tgCardLink [routerLink]="link()">{{ provider().name }}</a></h6>
            }
            @default {
              <h3 class="tg-provider-card__name"><a tgCardLink [routerLink]="link()">{{ provider().name }}</a></h3>
            }
          }
          @if (provider().verified) {
            <tg-badge icon="check">Verificado</tg-badge>
          }
        </div>

        <p class="tg-provider-card__meta">
          @if (rating(); as r) {
            <span class="tg-provider-card__rating">
              <tg-icon class="tg-provider-card__star" name="star" weight="fill" [size]="16" />
              <span aria-hidden="true"
                ><b>{{ r.value }}</b>{{ ' ' }}<span class="tg-provider-card__count">({{ r.count }})</span></span
              >
              <span class="tg-provider-card__sr">{{ r.label }}</span>
            </span>
          } @else {
            <tg-badge tone="accent">Novo no TaskGo</tg-badge>
          }
          @if (distance(); as d) {
            <span class="tg-provider-card__distance">
              <tg-icon name="map-pin" [size]="16" />
              {{ d }}
            </span>
          }
        </p>

        @if (service(); as s) {
          <p class="tg-provider-card__service">{{ s }}</p>
        }
      </div>

      @if (favorite() !== undefined) {
        <button
          type="button"
          class="tg-provider-card__favorite"
          [attr.aria-pressed]="favorite()"
          [attr.aria-label]="'Favoritar ' + provider().name"
          (click)="toggleFavorite()"
        >
          <tg-icon name="heart" [weight]="favorite() ? 'fill' : 'regular'" [size]="22" />
        </button>
      }

      <p class="tg-provider-card__price">
        @if (price(); as value) {
          <span class="tg-provider-card__price-label">a partir de</span>{{ ' ' }}
          <b class="tg-provider-card__price-value">{{ value }}</b>
        } @else {
          <span class="tg-provider-card__price-label">Preço sob consulta</span>
        }
      </p>
    </tg-card>
  `,
  styleUrl: './tg-provider-card.component.scss',
})
export class TgProviderCardComponent {
  readonly provider = input.required<TgProvider>();
  /** Destino do perfil, como no routerLink. */
  readonly link = input.required<string | readonly unknown[]>();
  /** Estado do favorito. Sem valor (undefined), o coração não aparece. */
  readonly favorite = input<boolean | undefined>(undefined);
  /** Nível do título: inteiro de 2 a 6; outro valor vira h3. */
  readonly headingLevel = input(3, { transform: toHeadingLevel });

  /** Pedido de troca, com o novo valor. O estado continua com a tela. */
  readonly favoriteChange = output<boolean>();

  /** Volta a tentar a foto quando a URL muda. */
  protected readonly photoFailed = linkedSignal({
    source: () => this.provider().photoUrl,
    computation: () => false,
  });

  protected readonly photo = computed(() => {
    const url = this.provider().photoUrl?.trim();
    return url && !this.photoFailed() ? url : null;
  });

  protected readonly initials = computed(() => {
    const words = this.provider().name.trim().split(/\s+/).filter(Boolean);
    if (!words.length) return '?';
    const first = words[0][0];
    const last = words.length > 1 ? words[words.length - 1][0] : '';
    return (first + last).toLocaleUpperCase('pt-BR');
  });

  protected readonly rating = computed(() => {
    const { rating, ratingCount } = this.provider();
    if (rating == null || ratingCount == null) return null;
    const value = Number(rating);
    const count = Number(ratingCount);
    // Cada avaliação é um inteiro de 1 a 5, então a média fica entre 1 e 5 e a
    // contagem é um inteiro positivo. Fora disso o dado não é real: nada de
    // truncar para 5,0; vale o estado sem avaliação.
    if (!Number.isFinite(value) || value < 1 || value > 5) return null;
    if (!Number.isSafeInteger(count) || count < 1) return null;
    const text = ONE_DECIMAL.format(value);
    const countText = COUNT.format(count);
    return {
      value: text,
      count: countText,
      label: `Nota ${text} de 5, ${countText} ${count === 1 ? 'avaliação' : 'avaliações'}`,
    };
  });

  protected readonly distance = computed(() => {
    const km = Number(this.provider().distanceKm);
    if (this.provider().distanceKm == null || !Number.isFinite(km) || km < 0) return null;
    return `${ONE_DECIMAL.format(km)} km`;
  });

  protected readonly service = computed(() => this.provider().service?.trim() || null);

  protected readonly price = computed(() => {
    const value = Number(this.provider().priceFrom);
    if (this.provider().priceFrom == null || !Number.isFinite(value) || value <= 0) return null;
    return (Number.isInteger(value) ? PRICE_INT : PRICE).format(value);
  });

  protected toggleFavorite() {
    this.favoriteChange.emit(!this.favorite());
  }
}

function toHeadingLevel(value: unknown): TgProviderCardHeadingLevel {
  const level = Number(value);
  return Number.isInteger(level) && level >= 2 && level <= 6 ? (level as TgProviderCardHeadingLevel) : 3;
}
