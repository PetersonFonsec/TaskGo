import { Component, inject, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { environment } from '@environments/environment';

interface Settlement {
  orderId: string;
  amount: number;
  status: string;
  completedAt: string | null;
}
@Component({
  selector: 'app-provider-payout',
  imports: [FormsModule, RouterLink, CurrencyPipe, DatePipe],
  template: `
    <main>
      <a routerLink="/provider">Voltar</a>
      <h1>Recebimentos</h1>
      <p>
        Cadastre uma chave PIX da sua titularidade. O repasse é iniciado após o cliente confirmar a
        conclusão do serviço.
      </p>
      @if (error()) {
        <p role="alert">{{ error() }}</p>
      }
      @if (message()) {
        <p role="status">{{ message() }}</p>
      }
      @if (loading()) {
        <p role="status">Carregando dados…</p>
      } @else if (loaded()) {
        <form (ngSubmit)="save()">
          <label for="pix-type">Tipo da chave</label>
          <select id="pix-type" name="type" [(ngModel)]="type" required>
            <option value="CPF">CPF</option>
            <option value="CNPJ">CNPJ</option>
            <option value="PHONE">Telefone</option>
            <option value="EMAIL">E-mail</option>
            <option value="RANDOM">Chave aleatória</option>
          </select>
          <label for="pix-key">Chave PIX</label>
          <input
            id="pix-key"
            name="key"
            [(ngModel)]="key"
            required
            maxlength="254"
            autocomplete="off"
          />
          <p>
            Alterações valem para novos pagamentos. Serviços já pagos mantêm a chave cadastrada
            naquele momento.
          </p>
          <button type="submit" [disabled]="busy() || !key.trim()">
            {{ busy() ? 'Salvando…' : 'Salvar chave PIX' }}
          </button>
        </form>
      } @else {
        <button type="button" (click)="load()">Tentar novamente</button>
      }
      <h2>Repasses recentes</h2>
      @for (item of settlements(); track item.orderId) {
        <article>
          <strong>Pedido #{{ item.orderId }} · {{ item.amount | currency: 'BRL' }}</strong>
          <p>{{ label(item.status) }}</p>
          @if (item.completedAt) {
            <small>{{ item.completedAt | date: 'dd/MM/yyyy HH:mm' }}</small>
          }
        </article>
      } @empty {
        <p>Nenhum repasse listado.</p>
      }
    </main>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      main {
        max-width: 680px;
        margin: 0 auto;
        padding: 24px;
      }
      form,
      article {
        display: grid;
        gap: 12px;
        padding: 24px;
        border: 1px solid #ddd;
        border-radius: 16px;
        margin: 20px 0;
      }
      input,
      select,
      button {
        font: inherit;
        padding: 12px;
        border: 1px solid #aaa;
        border-radius: 8px;
      }
      button {
        cursor: pointer;
        background: #165d45;
        color: white;
      }
      button:disabled {
        opacity: 0.6;
      }
      p {
        line-height: 1.5;
      }
    `,
  ],
})
export class ProviderPayoutPage implements OnInit {
  private readonly http = inject(HttpClient);
  key = '';
  type = 'CPF';
  loading = signal(false);
  loaded = signal(false);
  busy = signal(false);
  error = signal('');
  message = signal('');
  settlements = signal<Settlement[]>([]);
  ngOnInit() {
    this.load();
  }
  load() {
    this.loading.set(true);
    this.error.set('');
    this.http
      .get<{ key: string; type: string }>(environment.url + '/payments/payout-destination')
      .subscribe({
        next: (value) => {
          this.key = value.key;
          this.type = value.type;
          this.loaded.set(true);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Não foi possível carregar a chave PIX.');
          this.loading.set(false);
        },
      });
    this.http
      .get<Settlement[]>(environment.url + '/payments/payout-destination/settlements')
      .subscribe({
        next: (value) => this.settlements.set(value),
        error: () => this.error.set('Não foi possível carregar os repasses.'),
      });
  }
  save() {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.message.set('');
    this.http
      .put(environment.url + '/payments/payout-destination', { key: this.key, type: this.type })
      .subscribe({
        next: () => {
          this.message.set('Chave PIX salva.');
          this.busy.set(false);
        },
        error: () => {
          this.error.set('Não foi possível salvar. Confira o tipo e a chave PIX informados.');
          this.busy.set(false);
        },
      });
  }
  label(status: string) {
    const labels: Record<string, string> = {
      READY: 'Aguardando envio',
      SUBMITTING: 'Verificando envio',
      PENDING: 'Em processamento',
      SUCCEEDED: 'Repasse concluído',
      FAILED: 'Falha no repasse — entre em contato com o suporte',
      REVIEW: 'Em análise',
      BLOCKED: 'Repasse em análise',
    };
    return labels[status] ?? 'Em análise';
  }
}
