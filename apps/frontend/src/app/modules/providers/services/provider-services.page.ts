import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { catchError, map, of, startWith, Subject, switchMap } from 'rxjs';

import { environment } from '@environments/environment';
import { TgBadgeComponent } from '@shared/design-system/badge/tg-badge.component';
import { TgButtonComponent } from '@shared/design-system/button/tg-button.component';
import { TgCardComponent } from '@shared/design-system/card/tg-card.component';
import { TgDialogComponent } from '@shared/design-system/dialog/tg-dialog.component';
import { TgSheetComponent } from '@shared/design-system/dialog/tg-sheet.component';
import { TgEmptyStateComponent } from '@shared/design-system/empty-state/tg-empty-state.component';
import { TgAlertComponent } from '@shared/design-system/feedback/tg-alert.component';
import { TgFieldComponent } from '@shared/design-system/field/tg-field.component';
import { TgInputDirective } from '@shared/design-system/field/tg-input.directive';
import { TgIconComponent } from '@shared/design-system/icon/tg-icon.component';
import { TgLoadingComponent, TgLoadingSkeletonDirective } from '@shared/design-system/skeleton/tg-loading.component';
import { TgSkeletonComponent } from '@shared/design-system/skeleton/tg-skeleton.component';

export interface Offer {
  id: string;
  title: string;
  description?: string | null;
  category: string;
  basePrice: number | string;
  status: 'ATIVO' | 'INATIVO' | string;
  availability?: {
    weekdays?: Record<string, { start: string; end: string; slotMinutes: number }[]>;
  } | null;
}

export const WEEKDAYS = [
  { key: 'monday', label: 'Seg', name: 'segunda' },
  { key: 'tuesday', label: 'Ter', name: 'terça' },
  { key: 'wednesday', label: 'Qua', name: 'quarta' },
  { key: 'thursday', label: 'Qui', name: 'quinta' },
  { key: 'friday', label: 'Sex', name: 'sexta' },
  { key: 'saturday', label: 'Sáb', name: 'sábado' },
  { key: 'sunday', label: 'Dom', name: 'domingo' },
] as const;

interface Draft {
  title: string;
  description: string;
  category: string;
  price: string;
  days: Record<string, boolean>;
  start: string;
  end: string;
  duration: number;
  active: boolean;
}

const DURATIONS = [15, 30, 45, 60, 90, 120, 180, 240, 300, 360, 420, 480];
/** Limites da duração no backend (`validateAvailability`). */
const DURATION_MIN = 15;
const DURATION_MAX = 480;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Meus serviços do prestador (Etapa 10): a lista de serviços em cards do
 * Design System e o formulário (novo ou editar) num painel. Os endpoints e o
 * payload são os de antes: GET /services/mine, POST /services,
 * PATCH /services/:id e DELETE /services/:id (desativar).
 */
@Component({
  selector: 'app-provider-services',
  imports: [
    FormsModule,
    TgAlertComponent,
    TgBadgeComponent,
    TgButtonComponent,
    TgCardComponent,
    TgDialogComponent,
    TgEmptyStateComponent,
    TgFieldComponent,
    TgInputDirective,
    TgIconComponent,
    TgLoadingComponent,
    TgLoadingSkeletonDirective,
    TgSheetComponent,
    TgSkeletonComponent,
  ],
  templateUrl: './provider-services.page.html',
  styleUrl: './provider-services.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProviderServicesPage {
  readonly #http = inject(HttpClient);
  readonly #destroyRef = inject(DestroyRef);
  readonly #url = environment.url + '/services';

  readonly days = WEEKDAYS;
  readonly durations = DURATIONS;

  readonly offers = signal<Offer[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly categories = signal<{ slug: string; name: string }[]>([]);
  readonly categoriesError = signal(false);

  /** Mensagem de sucesso da última ação (região de status). */
  readonly message = signal('');
  readonly actionError = signal('');

  readonly sheet = viewChild.required<TgSheetComponent>('sheet');
  readonly confirm = viewChild.required<TgDialogComponent>('confirm');

  readonly editing = signal<Offer | null>(null);
  draft: Draft = emptyDraft();
  /**
   * Na edição de um serviço com horários: dias e horário como abriram. A
   * disponibilidade só vai no PATCH se a pessoa mexer neles; senão a API
   * mantém a que está salva (o formulário mostra um horário só).
   */
  #savedHours: string | null = null;
  /** Os horários salvos variam por dia ou têm mais de uma janela: o formulário não os representa. */
  readonly variedHours = signal(false);
  readonly submitted = signal(false);
  readonly saving = signal(false);
  readonly saveError = signal('');

  readonly deactivating = signal<Offer | null>(null);
  readonly busyDeactivate = signal(false);

  readonly activeCount = computed(() => this.offers().filter((o) => o.status === 'ATIVO').length);

  readonly #loads = new Subject<void>();

  constructor() {
    this.#loads
      .pipe(
        startWith(undefined),
        switchMap(() => {
          this.loading.set(true);
          this.loadError.set(false);
          return this.#http.get<Offer[]>(this.#url + '/mine').pipe(
            map((offers) => ({ ok: true as const, offers: Array.isArray(offers) ? offers : [] })),
            catchError(() => of({ ok: false as const })),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((result) => {
        if (result.ok) this.offers.set(result.offers);
        this.loadError.set(!result.ok);
        this.loading.set(false);
      });

    this.#http
      .get<{ data: { slug: string; name: string }[] }>(environment.url + '/categories?limit=100')
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (r) => this.categories.set(r?.data ?? []),
        error: () => this.categoriesError.set(true),
      });
  }

  load(): void {
    this.#loads.next();
  }

  categoryName(slug: string): string {
    return this.categories().find((c) => c.slug === slug)?.name ?? slug;
  }

  price(offer: Offer): number {
    return Number(offer.basePrice);
  }

  /** "Seg a Sex · 09:00 às 17:00 · 60 min"; sem horários, "Sem horários definidos". */
  schedule(offer: Offer): string {
    const weekdays = offer.availability?.weekdays ?? {};
    const selected = WEEKDAYS.filter((d) => weekdays[d.key]?.length);
    const window = selected.length ? weekdays[selected[0].key][0] : null;
    if (!window) return 'Sem horários definidos';
    return `${daysLabel(selected.map((d) => d.key))} · ${window.start} às ${window.end} · ${window.slotMinutes} min`;
  }

  openNew(): void {
    this.editing.set(null);
    this.draft = emptyDraft();
    this.#savedHours = null;
    this.variedHours.set(false);
    this.#openSheet();
  }

  openEdit(offer: Offer): void {
    this.editing.set(offer);
    const weekdays = offer.availability?.weekdays ?? {};
    const window = Object.values(weekdays).flat()[0];
    this.draft = {
      title: offer.title,
      description: offer.description ?? '',
      category: offer.category,
      price: priceText(Number(offer.basePrice)),
      days: Object.fromEntries(WEEKDAYS.map((d) => [d.key, !!weekdays[d.key]?.length])),
      start: window?.start ?? '09:00',
      end: window?.end ?? '17:00',
      duration: window?.slotMinutes ?? 60,
      active: offer.status === 'ATIVO',
    };
    const windows = Object.values(weekdays).flat();
    this.#savedHours = windows.length ? hoursKey(this.draft) : null;
    this.variedHours.set(
      Object.values(weekdays).some((list) => list.length > 1) ||
        windows.some((w) => w.start !== window?.start || w.end !== window?.end || w.slotMinutes !== window?.slotMinutes),
    );
    this.#openSheet();
  }

  /** Vai disponibilidade no envio: sempre ao criar, ou na edição quando dias ou horário mudaram (ou não havia horários). */
  sendsHours(): boolean {
    return this.#savedHours === null || hoursKey(this.draft) !== this.#savedHours;
  }

  hoursHint(): string {
    if (!this.editing() || this.#savedHours === null) return 'Horário de São Paulo.';
    if (this.variedHours())
      return 'Este serviço tem horários diferentes por dia. Eles ficam como estão, a não ser que você mude os dias ou o horário aqui: aí todos os dias escolhidos passam a usar este horário.';
    return 'Horário de São Paulo. Os horários só mudam se você alterar os dias ou o horário.';
  }

  toggleDay(key: string): void {
    this.draft = { ...this.draft, days: { ...this.draft.days, [key]: !this.draft.days[key] } };
  }

  /** Erros do formulário, por campo; vazios até tentar salvar. */
  errors() {
    if (!this.submitted()) return {} as FormErrors;
    return this.#validate();
  }

  /** Sem mudança nos horários, eles não vão no envio: dias e horário não bloqueiam. */
  #validate(): FormErrors {
    const errors = validate(this.draft);
    if (!this.sendsHours()) {
      delete errors.days;
      delete errors.hours;
    }
    return errors;
  }

  save(): void {
    if (this.saving()) return;
    this.submitted.set(true);
    this.saveError.set('');
    if (Object.keys(this.#validate()).length) return;

    const d = this.draft;
    const availability = {
      timezone: 'America/Sao_Paulo',
      weekdays: Object.fromEntries(
        WEEKDAYS.filter((day) => d.days[day.key]).map((day) => [
          day.key,
          [{ start: d.start, end: d.end, slotMinutes: Number(d.duration) }],
        ]),
      ),
    };
    const payload = {
      title: d.title.trim(),
      description: d.description.trim(),
      category: d.category,
      basePrice: parsePrice(d.price),
      status: d.active ? 'ATIVO' : 'INATIVO',
      // PATCH parcial: sem `availability`, a API mantém a que está salva.
      ...(this.sendsHours() ? { availability } : {}),
    };
    const editing = this.editing();
    const request = editing ? this.#http.patch(`${this.#url}/${editing.id}`, payload) : this.#http.post(this.#url, payload);
    this.saving.set(true);
    request.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe({
      next: () => {
        this.saving.set(false);
        this.sheet().close();
        this.message.set(editing ? 'Serviço atualizado.' : 'Serviço criado.');
        this.load();
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.saveError.set(apiMessage(error) ?? 'Não foi possível salvar o serviço. Tente de novo.');
      },
    });
  }

  askDeactivate(offer: Offer): void {
    this.deactivating.set(offer);
    this.actionError.set('');
    this.confirm().open();
  }

  deactivate(): void {
    const offer = this.deactivating();
    if (!offer || this.busyDeactivate()) return;
    this.busyDeactivate.set(true);
    this.#http
      .delete(`${this.#url}/${offer.id}`)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: () => {
          this.busyDeactivate.set(false);
          this.confirm().close();
          this.message.set(`"${offer.title}" foi desativado e não recebe novos pedidos.`);
          this.load();
        },
        error: (error: unknown) => {
          this.busyDeactivate.set(false);
          this.confirm().close();
          this.actionError.set(apiMessage(error) ?? 'Não foi possível desativar o serviço. Tente de novo.');
        },
      });
  }

  #openSheet(): void {
    this.submitted.set(false);
    this.saveError.set('');
    this.message.set('');
    this.sheet().open();
  }
}

function emptyDraft(): Draft {
  return {
    title: '',
    description: '',
    category: '',
    price: '',
    days: Object.fromEntries(WEEKDAYS.map((d, i) => [d.key, i < 5])),
    start: '09:00',
    end: '17:00',
    duration: 60,
    active: true,
  };
}

/** Os erros de cada campo, com o texto que diz como corrigir. */
export type FormErrors = Partial<Record<'title' | 'description' | 'category' | 'price' | 'days' | 'hours', string>>;

export function validate(d: Draft): FormErrors {
  const errors: FormErrors = {};
  const title = d.title.trim();
  if (title.length < 3) errors['title'] = 'Dê um nome com pelo menos 3 letras.';
  else if (title.length > 120) errors['title'] = 'Use até 120 caracteres.';
  if (d.description.length > 2000) errors['description'] = 'Use até 2.000 caracteres.';
  if (!d.category) errors['category'] = 'Escolha a categoria do serviço.';
  const price = parsePrice(d.price);
  if (price === null || price < 0.01 || price > 100000) errors['price'] = 'Informe um preço entre R$ 0,01 e R$ 100.000.';
  if (!WEEKDAYS.some((day) => d.days[day.key])) errors['days'] = 'Escolha pelo menos um dia.';
  const duration = Number(d.duration);
  if (!TIME.test(d.start ?? '') || !TIME.test(d.end ?? '')) errors['hours'] = 'Informe o início e o fim, como 09:00.';
  else if (d.end <= d.start) errors['hours'] = 'O fim precisa ser depois do início.';
  else if (!Number.isInteger(duration) || duration < DURATION_MIN || duration > DURATION_MAX)
    errors['hours'] = 'Escolha uma duração entre 15 minutos e 8 horas.';
  else if (minutes(d.end) - minutes(d.start) < duration)
    errors['hours'] = 'O intervalo entre o início e o fim precisa caber pelo menos um atendimento.';
  return errors;
}

/** "09:30" em minutos do dia. */
function minutes(time: string): number {
  return Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
}

/** Dias e horário do formulário, para saber se mudaram. */
function hoursKey(d: Draft): string {
  const days = WEEKDAYS.filter((day) => d.days[day.key]).map((day) => day.key);
  return JSON.stringify([days, d.start, d.end, Number(d.duration)]);
}

/** "120", "120,50" ou "1.200,50" em número; inválido, null. */
export function parsePrice(text: string): number | null {
  const clean = String(text ?? '').trim().replace(/\s/g, '');
  if (!clean) return null;
  const normalized = clean.includes(',') ? clean.replace(/\./g, '').replace(',', '.') : clean;
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

function priceText(value: number): string {
  return Number.isFinite(value) ? value.toFixed(2).replace('.', ',') : '';
}

/** "Seg a Sex", "Todos os dias", "Seg, Qua e Sex". */
export function daysLabel(keys: string[]): string {
  const idx = keys.map((k) => WEEKDAYS.findIndex((d) => d.key === k)).filter((i) => i >= 0).sort((a, b) => a - b);
  if (idx.length === 7) return 'Todos os dias';
  const consecutive = idx.length > 2 && idx.every((v, i) => i === 0 || v === idx[i - 1] + 1);
  if (consecutive) return `${WEEKDAYS[idx[0]].label} a ${WEEKDAYS[idx[idx.length - 1]].label}`;
  const labels = idx.map((i) => WEEKDAYS[i].label);
  return labels.length > 1 ? `${labels.slice(0, -1).join(', ')} e ${labels[labels.length - 1]}` : (labels[0] ?? '');
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
