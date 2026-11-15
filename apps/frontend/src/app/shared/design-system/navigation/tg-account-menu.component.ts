import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TgIconComponent } from '../icon/tg-icon.component';
import { TgNavItem } from './tg-nav-item';

let nextId = 0;

/**
 * Menu da conta na barra do topo (a partir de 1024 px; abaixo, a conta é
 * uma aba do `tg-nav`). Botão com avatar e primeiro nome que abre uma lista
 * de links e o "Sair da conta".
 *
 *   <tg-account-menu name="Ana Souza" detail="Cliente" [links]="conta" (signOut)="sair()" />
 *
 * É um disclosure, não um role=menu: o botão tem aria-expanded e
 * aria-controls, e o painel é uma lista comum de links. Esc fecha e devolve
 * o foco ao botão; clique fora, escolher um link ou o foco sair do menu
 * também fecham.
 */
@Component({
  selector: 'tg-account-menu',
  imports: [RouterLink, TgIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'closeOnOutside($event)',
    '(keydown.escape)': 'closeAndFocus()',
    '(focusout)': 'closeOnFocusOut($event)',
  },
  template: `
    <button
      #trigger
      type="button"
      class="tg-account__trigger"
      [attr.aria-expanded]="open()"
      [attr.aria-controls]="panelId"
      (click)="toggle()"
    >
      <span class="tg-account__avatar" aria-hidden="true">
        @if (photo()) {
          <img [src]="photo()" alt="" width="36" height="36" />
        } @else {
          {{ initials() }}
        }
      </span>
      <span class="tg-account__first"><span class="tg-account__sr">Conta de </span>{{ firstName() }}</span>
      <tg-icon class="tg-account__caret" name="caret-down" [size]="16" />
    </button>

    <div class="tg-account__panel" [id]="panelId" [hidden]="!open()">
      <div class="tg-account__who">
        <span class="tg-account__avatar tg-account__avatar--lg" aria-hidden="true">
          @if (photo()) {
            <img [src]="photo()" alt="" width="40" height="40" />
          } @else {
            {{ initials() }}
          }
        </span>
        <span class="tg-account__identity">
          <strong>{{ name() }}</strong>
          @if (detail()) {
            <span>{{ detail() }}</span>
          }
        </span>
      </div>
      <ul class="tg-account__list">
        @for (item of links(); track item.label) {
          <li>
            <a class="tg-account__item" [routerLink]="item.link" (click)="close()">
              <tg-icon [name]="item.icon" [size]="20" />
              {{ item.label }}
            </a>
          </li>
        }
        <li>
          <button type="button" class="tg-account__item" (click)="leave()">
            <tg-icon name="sign-out" [size]="20" />
            {{ signOutLabel() }}
          </button>
        </li>
      </ul>
    </div>
  `,
  styleUrl: './tg-account-menu.component.scss',
})
export class TgAccountMenuComponent {
  /** Nome completo de quem está na sessão. */
  readonly name = input.required<string>();
  /** Linha de apoio no painel, como "Cliente" ou "Profissional". */
  readonly detail = input('');
  /** Foto; sem ela, o avatar mostra as iniciais. */
  readonly photo = input<string | null | undefined>(undefined);
  /** Links da conta (Dados pessoais, Endereços). */
  readonly links = input<readonly TgNavItem[]>([]);
  readonly signOutLabel = input('Sair da conta');
  readonly signOut = output<void>();

  readonly open = signal(false);
  protected readonly panelId = `tg-account-panel-${nextId++}`;

  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');

  protected readonly firstName = computed(() => this.name().trim().split(/\s+/)[0] ?? '');
  protected readonly initials = computed(() => {
    const parts = this.name().trim().split(/\s+/).filter(Boolean);
    const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] ?? '').slice(0, 2);
    return letters.toUpperCase();
  });

  toggle() {
    this.open.update((value) => !value);
  }

  close() {
    this.open.set(false);
  }

  protected closeAndFocus() {
    if (!this.open()) return;
    this.close();
    this.trigger().nativeElement.focus();
  }

  protected closeOnOutside(event: Event) {
    if (this.open() && !this.#host.contains(event.target as Node)) this.close();
  }

  protected closeOnFocusOut(event: FocusEvent) {
    const next = event.relatedTarget as Node | null;
    if (this.open() && next && !this.#host.contains(next)) this.close();
  }

  protected leave() {
    this.close();
    this.signOut.emit();
  }
}
