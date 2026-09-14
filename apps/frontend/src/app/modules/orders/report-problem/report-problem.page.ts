import { Component, inject, signal, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { environment } from '@environments/environment';
@Component({
  selector: 'app-report-problem',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `<main>
    <h1>Reportar problema</h1>
    <p>
      Descreva o ocorrido. A confirmação da conclusão fica bloqueada enquanto o caso estiver aberto.
      Abrir um caso não solicita reembolso automático.
    </p>
    <form (ngSubmit)="submit()">
      <label
        >Motivo<input
          name="reason"
          [(ngModel)]="reason"
          required
          minlength="3"
          maxlength="120" /></label
      ><label
        >O que aconteceu?<textarea
          name="description"
          [(ngModel)]="description"
          required
          minlength="10"
          maxlength="2000"
        ></textarea></label
      ><button [disabled]="busy() || openCase()">
        {{ busy() ? 'Enviando…' : 'Enviar para análise' }}
      </button>
    </form>
    @if (error()) {
      <p role="alert">{{ error() }}</p>
    }
    @for (item of cases(); track item.id) {
      <article>
        <h2>Caso #{{ item.id }} — {{ label(item.status) }}</h2>
        <p>{{ item.reason }}</p>
        <p>{{ item.description }}</p>
        @if (item.resolution) {
          <p>Resposta: {{ item.resolution }}</p>
        }
      </article>
    }
    <a [routerLink]="['/orders', id]">Voltar ao pedido</a>
  </main>`,
  styles: [
    `
      main {
        max-width: 640px;
        margin: 3rem auto;
        padding: 1rem;
      }
      form,
      label {
        display: grid;
        gap: 1rem;
      }
      input,
      textarea,
      button {
        padding: 0.8rem;
        font: inherit;
      }
      article {
        border: 1px solid #ccc;
        padding: 1rem;
        margin: 1rem 0;
      }
      textarea {
        min-height: 120px;
      }
    `,
  ],
})
export class ReportProblemPage implements OnInit {
  private readonly http = inject(HttpClient);
  readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id');
  reason = '';
  description = '';
  busy = signal(false);
  error = signal('');
  cases = signal<any[]>([]);
  ngOnInit() {
    this.load();
  }
  openCase() {
    return this.cases().some((c) => ['OPEN', 'UNDER_REVIEW'].includes(c.status));
  }
  label(status: string) {
    return (
      (
        {
          OPEN: 'Aberto',
          UNDER_REVIEW: 'Em análise',
          RESOLVED: 'Resolvido',
          REJECTED: 'Encerrado',
        } as Record<string, string>
      )[status] ?? status
    );
  }
  load() {
    this.http
      .get<any[]>(`${environment.url}/orders/${this.id}/disputes`)
      .subscribe({
        next: (result) => this.cases.set(result),
        error: () => this.error.set('Não foi possível carregar os casos deste pedido.'),
      });
  }
  submit() {
    if (this.busy() || this.openCase()) return;
    this.busy.set(true);
    this.error.set('');
    this.http
      .post(`${environment.url}/orders/${this.id}/disputes`, {
        reason: this.reason,
        description: this.description,
      })
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: () => this.load(),
        error: (error) =>
          this.error.set(error.error?.message ?? 'Não foi possível enviar o problema.'),
      });
  }
}
