import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TgOrderListComponent, TgOrderRowComponent, type TgOrderRowData } from './tg-order-row.component';
import type { TgOrderPerspective } from './tg-order-status';

// Layout medido no navegador real do Karma: a linha segue o container.

function pinTheme(theme: 'CUSTOMER' | 'PROVIDER') {
  const root = document.documentElement;
  const previous = root.getAttribute('data-theme');
  root.setAttribute('data-theme', theme);
  return () => (previous === null ? root.removeAttribute('data-theme') : root.setAttribute('data-theme', previous));
}

const order: TgOrderRowData = {
  id: '7',
  status: 'AGENDADO',
  service: 'Instalação de chuveiro',
  person: 'Bruno Alves',
  scheduledFor: null,
  neighborhood: 'Vila Madalena',
  distanceKm: 1.2,
  amount: 120,
};

@Component({
  imports: [TgOrderListComponent, TgOrderRowComponent],
  template: `
    <ul tgOrderList [style.width.px]="width()">
      <li><tg-order-row [order]="order()" [perspective]="perspective()" /></li>
      <li><tg-order-row [order]="order()" perspective="customer" /></li>
    </ul>
  `,
})
class Host {
  readonly width = signal(720);
  readonly order = signal<TgOrderRowData>(order);
  readonly perspective = signal<TgOrderPerspective>('provider');
}

describe('TgOrderRowComponent (layout)', () => {
  let fixture: ComponentFixture<Host>;
  let host: Host;
  let el: HTMLElement;

  const first = () => el.querySelector('tg-order-row')!;
  const rect = (sel: string) => first().querySelector(sel)!.getBoundingClientRect();
  const render = (width: number, patch: Partial<TgOrderRowData> = {}) => {
    host.width.set(width);
    host.order.set({ ...order, ...patch });
    fixture.detectChanges();
  };
  const actionBelow = () => rect('.tg-order-row__step').top >= rect('.tg-order-row__main').bottom - 1;
  const actionRight = () => rect('.tg-order-row__step').left >= rect('.tg-order-row__main').right - 1;
  const noOverflow = () => {
    const list = el.querySelector('ul')!;
    const box = list.getBoundingClientRect();
    const inside = [...list.querySelectorAll<HTMLElement>('*')].every((n) => {
      const r = n.getBoundingClientRect();
      return r.width === 0 || (r.left >= box.left - 0.5 && r.right <= box.right + 0.5);
    });
    return inside && list.scrollWidth <= list.clientWidth;
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

  it('container largo: botão à direita, centralizado na linha', () => {
    render(720);
    expect(actionRight()).toBeTrue();
    expect(actionBelow()).toBeFalse();
    expect(noOverflow()).toBeTrue();
  });

  it('container estreito (320 px) numa janela larga: botão desce, sem overflow', () => {
    render(320);
    expect(actionBelow()).toBeTrue();
    expect(rect('.tg-order-row__step').left).toBeLessThanOrEqual(rect('.tg-order-row__main').left + 1);
    expect(noOverflow()).toBeTrue();
  });

  it('textos longos quebram dentro da lista, nas duas larguras', () => {
    for (const width of [280, 720]) {
      render(width, {
        service: 'Montagem de móveis planejados e reparos em geral em apartamento de três quartos',
        person: 'Maria Clara de Albuquerque Nogueira Vasconcelos',
        neighborhood: 'Jardim Paulista Estendido de Cima',
        status: 'AGUARDANDO_CONFIRMACAO_CLIENTE',
      });
      expect(noOverflow()).withContext(`${width}`).toBeTrue();
      render(width, { service: 'Supercalifragilisticexpialidocious'.repeat(3) });
      expect(noOverflow()).withContext(`${width} palavra sem quebra`).toBeTrue();
    }
  });

  it('container estreito com badge longo: o badge desce e o título não parte palavras', () => {
    render(320, { status: 'AGUARDANDO_CONFIRMACAO_CLIENTE', service: 'Montagem de armário' });
    host.perspective.set('customer');
    fixture.detectChanges();
    const link = rect('.tg-order-row__link');
    const line = parseFloat(getComputedStyle(first().querySelector('.tg-order-row__link')!).lineHeight);
    expect(link.height).toBeLessThanOrEqual(line + 1);
    expect(rect('tg-badge').top).toBeGreaterThanOrEqual(link.bottom - 1);
  });

  it('o badge não encolhe nem quebra', () => {
    render(280, { status: 'AGUARDANDO_CONFIRMACAO_CLIENTE', service: 'Montagem de armário' });
    host.perspective.set('customer');
    fixture.detectChanges();
    const badge = rect('tg-badge');
    expect(badge.height).toBeLessThanOrEqual(26);
  });

  it('botão de 36 px com área de toque de 44 px, por cima do link esticado', () => {
    render(720);
    const button = rect('.tg-order-row__action');
    expect(Math.round(button.height)).toBe(36);
    const x = button.left + button.width / 2;
    for (const y of [button.top - 3, button.bottom + 3, button.top + button.height / 2]) {
      expect(document.elementFromPoint(x, y)?.closest('.tg-order-row__action')).withContext(`y=${y}`).not.toBeNull();
    }
    const main = rect('.tg-order-row__meta');
    expect(document.elementFromPoint(main.left + 4, main.top + main.height / 2)?.closest('a.tg-order-row__link')).not.toBeNull();
  });

  it('sem próximo passo, a linha ocupa a largura toda', () => {
    render(720, { status: 'CANCELADO' });
    expect(first().querySelector('.tg-order-row__step')).toBeNull();
    expect(noOverflow()).toBeTrue();
  });

  it('nos dois temas, o mesmo layout', () => {
    for (const theme of ['CUSTOMER', 'PROVIDER'] as const) {
      const restore = pinTheme(theme);
      try {
        render(320);
        expect(actionBelow()).withContext(theme).toBeTrue();
        render(720);
        expect(actionRight()).withContext(theme).toBeTrue();
        expect(noOverflow()).withContext(theme).toBeTrue();
      } finally {
        restore();
      }
    }
  });
});
