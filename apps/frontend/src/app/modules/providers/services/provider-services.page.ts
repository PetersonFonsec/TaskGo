import { Component, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { ButtonComponent } from '@shared/components/ui/button/button.component';
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
  imports: [FormsModule, RouterLink, CurrencyPipe, ButtonComponent],
  templateUrl: './provider-services.page.html',
  styleUrl: './provider-services.page.scss',
})
export class ProviderServicesPage implements OnInit {
  private readonly http = inject(HttpClient);
  offers = signal<Offer[]>([]);
  categories = signal<{ slug: string; name: string }[]>([]);
  error = signal('');
  message = signal('');
  busy = signal(false);
  loading = signal(false);
  loadError = signal('');
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
    this.loading.set(true);
    this.loadError.set('');
    this.http.get<Offer[]>(environment.url + '/services/mine').subscribe({
      next: (r) => {
        this.offers.set(r);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set('Não foi possível carregar seus serviços.');
      },
    });
  }
  edit(offer: Offer) {
    if (this.busy()) return;
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
    if (this.busy()) return;
    this.start = '09:00';
    this.end = '17:00';
    this.duration = 60;
    this.selectedDays = Object.fromEntries(this.days.map((day, index) => [day.key, index < 5]));
    this.error.set('');
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
    if (this.busy() || offer.status !== 'ATIVO') return;
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
