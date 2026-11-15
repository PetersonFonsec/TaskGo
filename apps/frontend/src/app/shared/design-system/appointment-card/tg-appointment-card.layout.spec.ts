import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { TgOrderPerspective } from '../order-row/tg-order-status';
import { TgAppointmentCardComponent, type TgAppointmentData } from './tg-appointment-card.component';

// Layout medido no navegador real do Karma: o card segue o container.

function pinTheme(theme: 'CUSTOMER' | 'PROVIDER') {
  const root = document.documentElement;
  const previous = root.getAttribute('data-theme');
  root.setAttribute('data-theme', theme);
  return () => (previous === null ? root.removeAttribute('data-theme') : root.setAttribute('data-theme', previous));
}

const order: TgAppointmentData = {
  id: '7',
  status: 'AGUARDANDO_CONFIRMACAO_CLIENTE',
  service: 'Instalação de chuveiro',
  person: 'Bruno Alves',
  scheduledFor: new Date(2026, 10, 18, 9, 0).toISOString(),
  address: 'Rua Harmonia, 123, apto 41',
  neighborhood: 'Vila Madalena',
  distanceKm: 1.2,
  amount: 120,
};

@Component({
  imports: [TgAppointmentCardComponent],
  template: `
    <div [style.width.px]="width()">
      <tg-appointment-card [order]="order()" [perspective]="perspective()" />
    </div>
  `,
})
class Host {
  readonly width = signal(560);
  readonly order = signal<TgAppointmentData>(order);
  readonly perspective = signal<TgOrderPerspective>('customer');
}

describe('TgAppointmentCardComponent (layout)', () => {
  let fixture: ComponentFixture<Host>;
  let host: Host;
  let el: HTMLElement;

  const card = () => el.querySelector('tg-appointment-card')!;
  const rect = (sel: string) => card().querySelector(sel)!.getBoundingClientRect();
  const render = (width: number, patch: Partial<TgAppointmentData> = {}, perspective: TgOrderPerspective = 'customer') => {
    host.width.set(width);
    host.order.set({ ...order, ...patch });
    host.perspective.set(perspective);
    fixture.detectChanges();
  };
  const badgeRight = () => rect('tg-badge').left >= rect('.tg-appointment-card__when').right - 1;
  const badgeBelow = () => rect('tg-badge').top >= rect('.tg-appointment-card__when').bottom - 1;
  const actionFull = () => Math.abs(rect('.tg-appointment-card__action').width - rect('.tg-appointment-card__step').width) <= 1;
  const noOverflow = () => {
    const box = card().getBoundingClientRect();
    return [...card().querySelectorAll<HTMLElement>('*')].every((n) => {
      const r = n.getBoundingClientRect();
      return r.width === 0 || (r.left >= box.left - 0.5 && r.right <= box.right + 0.5);
    });
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    fixture = TestBed.createComponent(Host);
    host = fixture.componentInstance;
    el = fixture.nativeElement;
    document.body.appendChild(el);
    fixture.detectChanges();
  });

  afterEach(() => el.remove());

  it('janela larga no Karma (a regra é do container)', () => {
    expect(window.innerWidth).toBeGreaterThanOrEqual(600);
  });

  it('container largo: status ao lado da data, botão do tamanho do texto', () => {
    render(560);
    expect(badgeRight()).toBeTrue();
    expect(actionFull()).toBeFalse();
    expect(noOverflow()).toBeTrue();
  });

  it('container estreito (320 px) numa janela larga: status desce, botão ocupa a largura', () => {
    render(320);
    expect(badgeBelow()).toBeTrue();
    expect(actionFull()).toBeTrue();
    expect(noOverflow()).toBeTrue();
  });

  it('hora grande e botão médio (44 px)', () => {
    render(560);
    expect(rect('.tg-appointment-card__time').height).toBeGreaterThan(rect('.tg-appointment-card__day').height * 1.5);
    expect(Math.round(rect('.tg-appointment-card__action').height)).toBe(44);
  });

  it('textos longos quebram dentro do card, nas duas larguras', () => {
    for (const width of [280, 560]) {
      render(
        width,
        {
          service: 'Montagem de móveis planejados e reparos em geral em apartamento de três quartos',
          person: 'Maria Clara de Albuquerque Nogueira Vasconcelos',
          address: 'Avenida Brigadeiro Faria Lima, 3477, bloco B, apartamento 1204',
          neighborhood: 'Jardim Paulista Estendido de Cima',
        },
        'provider',
      );
      expect(noOverflow()).withContext(`${width}`).toBeTrue();
      render(width, { service: 'Supercalifragilisticexpialidocious'.repeat(3), address: 'X'.repeat(90) });
      expect(noOverflow()).withContext(`${width} palavra sem quebra`).toBeTrue();
    }
  });

  it('o badge não encolhe nem quebra', () => {
    render(280);
    expect(rect('tg-badge').height).toBeLessThanOrEqual(26);
  });

  it('o link cobre o card e o botão fica por cima', () => {
    render(560);
    const place = rect('.tg-appointment-card__place');
    expect(document.elementFromPoint(place.left + 4, place.top + place.height / 2)?.closest('a.tg-card__link')).not.toBeNull();
    const action = rect('.tg-appointment-card__action');
    expect(
      document.elementFromPoint(action.left + action.width / 2, action.top + action.height / 2)?.closest('.tg-appointment-card__action'),
    ).not.toBeNull();
  });

  it('nos dois temas, o mesmo layout', () => {
    for (const theme of ['CUSTOMER', 'PROVIDER'] as const) {
      const restore = pinTheme(theme);
      try {
        render(320);
        expect(badgeBelow()).withContext(theme).toBeTrue();
        render(560);
        expect(badgeRight()).withContext(theme).toBeTrue();
        expect(noOverflow()).withContext(theme).toBeTrue();
      } finally {
        restore();
      }
    }
  });
});
