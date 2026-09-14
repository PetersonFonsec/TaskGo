import { Component, inject, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { environment } from '@environments/environment';

interface Offer {
  id: string;
  title: string;
  description?: string;
  category: string;
  basePrice: number;
  status: 'ATIVO' | 'INATIVO';
  availability?: {
    weekdays?: Record<string, { start: string; end: string; slotMinutes: number }[]>;
  };
}
@Component({
  selector: 'app-provider-services',
  imports: [FormsModule, RouterLink],
  template: ` <main>
    <a routerLink="/provider">← Voltar ao painel</a>
    <h1>Meus serviços</h1>
    <p>
      Configure preço e horários. Suas ofertas ficam disponíveis após a aprovação do seu perfil.
    </p>
    @if (error()) {
      <p role="alert">{{ error() }}</p>
    }
    @if (message()) {
      <p role="status">{{ message() }}</p>
    }
    <section aria-label="Ofertas">
      @for (offer of offers(); track offer.id) {
        <article>
          <h2>{{ offer.title }}</h2>
          <p>
            R$ {{ offer.basePrice }} ·
            {{ offer.status === 'ATIVO' ? 'Ativo' : 'Rascunho / inativo' }}
          </p>
          <button (click)="edit(offer)">Editar</button>
          <button [disabled]="busy()" (click)="deactivate(offer)">Desativar</button>
        </article>
      } @empty {
        <p>Você ainda não tem ofertas. Cadastre a primeira abaixo.</p>
      }
    </section>
    <form #form="ngForm" (ngSubmit)="save()">
      <h2>{{ editingId ? 'Editar oferta' : 'Nova oferta' }}</h2>
      <label
        >Nome do serviço<input
          name="title"
          [(ngModel)]="draft.title"
          required
          minlength="3"
          maxlength="120"
      /></label>
      <label
        >Descrição<textarea
          name="description"
          [(ngModel)]="draft.description"
          maxlength="2000"
        ></textarea>
      </label>
      <label
        >Categoria<select name="category" [(ngModel)]="draft.category" required>
          <option value="">Selecione</option>
          @for (category of categories(); track category.slug) {
            <option [value]="category.slug">{{ category.name }}</option>
          }
        </select></label
      >
      <label
        >Preço fixo (R$)<input
          name="price"
          type="number"
          min="0.01"
          max="100000"
          step="0.01"
          [(ngModel)]="draft.basePrice"
          required
      /></label>
      <fieldset>
        <legend>Dias de atendimento</legend>
        @for (day of days; track day.key) {
          <label class="day"
            ><input type="checkbox" [name]="day.key" [(ngModel)]="selectedDays[day.key]" />{{
              day.label
            }}</label
          >
        }
      </fieldset>
      <div class="hours">
        <label>Início<input name="start" type="time" [(ngModel)]="start" required /></label
        ><label>Fim<input name="end" type="time" [(ngModel)]="end" required /></label>
        <label
          >Duração (minutos)<input
            name="duration"
            type="number"
            min="15"
            max="480"
            step="15"
            [(ngModel)]="duration"
            required
        /></label>
      </div>
      <p>
        Horários no fuso de São Paulo. Ao salvar, estes horários substituem a disponibilidade
        anterior desta oferta.
      </p>
      <label class="day"
        ><input type="checkbox" name="active" [(ngModel)]="active" />Ativar oferta</label
      >
      <button [disabled]="busy() || form.invalid">
        {{ busy() ? 'Salvando...' : 'Salvar oferta' }}
      </button>
      <button type="button" (click)="reset()">Nova oferta</button>
    </form>
  </main>`,
  styles: [
    `
      main {
        max-width: 900px;
        margin: auto;
        padding: 24px;
      }
      section {
        display: grid;
        gap: 16px;
        grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
      }
      article,
      form {
        padding: 24px;
        border: 1px solid #ddd;
        border-radius: 16px;
        margin: 20px 0;
        background: white;
      }
      label {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin: 12px 0;
      }
      input,
      select,
      textarea,
      button {
        font: inherit;
        padding: 10px;
        border: 1px solid #bbb;
        border-radius: 8px;
      }
      .day {
        display: inline-flex;
        flex-direction: row;
        align-items: center;
        margin-right: 14px;
      }
      .hours {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
      }
      [role='alert'] {
        color: #a01818;
      }
      button {
        cursor: pointer;
      }
      button:disabled {
        opacity: 0.5;
      }
    `,
  ],
})
export class ProviderServicesPage implements OnInit {
  private readonly http = inject(HttpClient);
  offers = signal<Offer[]>([]);
  categories = signal<{ slug: string; name: string }[]>([]);
  error = signal('');
  message = signal('');
  busy = signal(false);
  editingId = '';
  draft = { title: '', description: '', category: '', basePrice: 0 };
  start = '09:00';
  end = '17:00';
  duration = 60;
  active = false;
  days = [
    { key: 'monday', label: 'Seg' },
    { key: 'tuesday', label: 'Ter' },
    { key: 'wednesday', label: 'Qua' },
    { key: 'thursday', label: 'Qui' },
    { key: 'friday', label: 'Sex' },
    { key: 'saturday', label: 'Sáb' },
    { key: 'sunday', label: 'Dom' },
  ];
  selectedDays: Record<string, boolean> = {
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
  };
  ngOnInit() {
    this.load();
    this.http
      .get<{ data: { slug: string; name: string }[] }>(environment.url + '/categories?limit=100')
      .subscribe({
        next: (r) => this.categories.set(r.data),
        error: () => this.error.set('Não foi possível carregar categorias.'),
      });
  }
  load() {
    this.http.get<Offer[]>(environment.url + '/services/mine').subscribe({
      next: (r) => this.offers.set(r),
      error: () => this.error.set('Não foi possível carregar seus serviços.'),
    });
  }
  edit(offer: Offer) {
    this.editingId = offer.id;
    this.draft = {
      title: offer.title,
      description: offer.description ?? '',
      category: offer.category,
      basePrice: Number(offer.basePrice),
    };
    this.active = offer.status === 'ATIVO';
    const weekdays = offer.availability?.weekdays ?? {};
    this.selectedDays = Object.fromEntries(
      this.days.map((d) => [d.key, !!weekdays[d.key]?.length]),
    );
    const window = Object.values(weekdays).flat()[0];
    this.start = window?.start ?? '09:00';
    this.end = window?.end ?? '17:00';
    this.duration = window?.slotMinutes ?? 60;
    this.message.set('');
  }
  reset() {
    this.editingId = '';
    this.draft = { title: '', description: '', category: '', basePrice: 0 };
    this.active = false;
    this.message.set('');
  }
  save() {
    if (this.busy()) return;
    this.error.set('');
    this.message.set('');
    this.busy.set(true);
    const payload = {
      ...this.draft,
      status: this.active ? 'ATIVO' : 'INATIVO',
      availability: {
        timezone: 'America/Sao_Paulo',
        weekdays: Object.fromEntries(
          this.days
            .filter((d) => this.selectedDays[d.key])
            .map((d) => [
              d.key,
              [{ start: this.start, end: this.end, slotMinutes: this.duration }],
            ]),
        ),
      },
    };
    const url = environment.url + '/services';
    const request = this.editingId
      ? this.http.patch(url + '/' + this.editingId, payload)
      : this.http.post(url, payload);
    request.subscribe({
      next: () => {
        this.busy.set(false);
        this.message.set('Oferta salva.');
        this.load();
      },
      error: (e) => {
        this.busy.set(false);
        this.error.set([e.error?.message ?? 'Não foi possível salvar.'].flat().join(' '));
      },
    });
  }
  deactivate(offer: Offer) {
    this.busy.set(true);
    this.http.delete(environment.url + '/services/' + offer.id).subscribe({
      next: () => {
        this.busy.set(false);
        this.load();
      },
      error: () => {
        this.busy.set(false);
        this.error.set('Não foi possível desativar.');
      },
    });
  }
}
