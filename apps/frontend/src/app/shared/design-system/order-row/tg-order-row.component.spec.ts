import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { TgOrderListComponent, TgOrderRowComponent, type TgOrderRowData } from './tg-order-row.component';
import type { TgOrderPerspective, TgOrderStatusAction } from './tg-order-status';

const base: TgOrderRowData = {
  id: '7',
  status: 'AGUARDANDO_PAGAMENTO',
  service: 'Limpeza residencial',
  person: 'Ana Souza',
  scheduledFor: null,
  neighborhood: 'Pinheiros',
  distanceKm: 2.1,
  amount: 180,
  reviewed: false,
};

@Component({
  imports: [TgOrderListComponent, TgOrderRowComponent],
  template: `
    <ul tgOrderList>
      <li>
        <tg-order-row
          [order]="order()"
          [perspective]="perspective()"
          [busy]="busy()"
          (statusAction)="actions.push($event)" />
      </li>
      <li><tg-order-row [order]="other" perspective="customer" /></li>
    </ul>
  `,
})
class Host {
  readonly order = signal<TgOrderRowData>(base);
  readonly perspective = signal<TgOrderPerspective>('customer');
  readonly busy = signal(false);
  readonly other: TgOrderRowData = { id: '8', status: 'CANCELADO', service: 'Pintura' };
  readonly actions: TgOrderStatusAction[] = [];
}

const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

describe('TgOrderRowComponent', () => {
  let fixture: ComponentFixture<Host>;
  let host: Host;
  let el: HTMLElement;
  let row: HTMLElement;

  const set = (patch: Partial<TgOrderRowData>, perspective?: TgOrderPerspective) => {
    host.order.set({ ...base, ...patch });
    if (perspective) host.perspective.set(perspective);
    fixture.detectChanges();
  };
  const q = (sel: string) => row.querySelector<HTMLElement>(sel);
  const described = (node: Element) =>
    (node.getAttribute('aria-describedby') ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .map((id) => text(document.getElementById(id)))
      .join(' ');

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    fixture = TestBed.createComponent(Host);
    host = fixture.componentInstance;
    el = fixture.nativeElement;
    document.body.appendChild(el);
    fixture.detectChanges();
    row = el.querySelector('tg-order-row')!;
  });

  afterEach(() => el.remove());

  it('lista: ul com a classe da superfície, um item por linha', () => {
    const ul = el.querySelector('ul')!;
    expect(ul.classList).toContain('tg-order-list');
    expect(ul.querySelectorAll(':scope > li > tg-order-row').length).toBe(2);
  });

  it('o serviço é o link para o pedido, com o status como descrição', () => {
    const link = q('a.tg-order-row__link')!;
    expect(text(link)).toBe('Limpeza residencial');
    expect(link.getAttribute('href')).toBe('/orders/7');
    expect(described(link)).toBe('Aguardando pagamento');
  });

  it('badge com o texto e o tom do mapa, para cada perspectiva', () => {
    set({ status: 'EM_DESLOCAMENTO' }, 'customer');
    expect(text(q('tg-badge'))).toBe('Profissional a caminho');
    expect(q('tg-badge')!.classList).toContain('tg-badge--progress');
    set({ status: 'EM_DESLOCAMENTO' }, 'provider');
    expect(text(q('tg-badge'))).toBe('A caminho');
    set({ status: 'PENDENTE' });
    expect(text(q('tg-badge'))).toBe('Em atualização');
    expect(q('tg-badge')!.classList).toContain('tg-badge--neutral');
    expect(text(row)).not.toContain('PENDENTE');
  });

  it('badge só com texto (sem ícone de status na linha)', () => {
    for (const status of ['AGENDADO', 'EM_DESLOCAMENTO', 'CONCLUIDO', 'CANCELADO']) {
      set({ status });
      expect(q('tg-badge tg-icon')).withContext(status).toBeNull();
    }
  });

  it('linha de apoio: pessoa · data · bairro; distância só para o prestador', () => {
    expect(text(q('.tg-order-row__meta'))).toBe('Ana Souza · Data a combinar · Pinheiros');
    set({}, 'provider');
    expect(text(q('.tg-order-row__meta'))).toBe('Ana Souza · Data a combinar · Pinheiros, 2,1 km');
    set({ person: '  ', neighborhood: null, distanceKm: null }, 'provider');
    expect(text(q('.tg-order-row__meta'))).toBe('Data a combinar');
    set({ neighborhood: null, distanceKm: 0.8 }, 'provider');
    expect(text(q('.tg-order-row__meta'))).toBe('Ana Souza · Data a combinar · 0,8 km');
  });

  it('valor só para o prestador, em reais; inválido some', () => {
    expect(q('.tg-order-row__amount')).toBeNull();
    set({}, 'provider');
    expect(text(q('.tg-order-row__amount')).replace(/ /g, ' ')).toBe('R$ 180');
    set({ amount: 99.5 }, 'provider');
    expect(text(q('.tg-order-row__amount')).replace(/ /g, ' ')).toBe('R$ 99,50');
    for (const amount of [null, 0, -1, NaN]) {
      set({ amount }, 'provider');
      expect(q('.tg-order-row__amount')).withContext(String(amount)).toBeNull();
    }
  });

  describe('próximo passo', () => {
    it('link do cliente, com o serviço como descrição', () => {
      const pay = q('a.tg-order-row__action')!;
      expect(text(pay)).toBe('Pagar');
      expect(pay.getAttribute('href')).toBe('/orders/7/payment');
      expect(described(pay)).toBe('Limpeza residencial');
      set({ status: 'AGUARDANDO_CONFIRMACAO_CLIENTE' });
      expect(q('a.tg-order-row__action')!.getAttribute('href')).toBe('/orders/7/confirm');
      set({ status: 'CONCLUIDO' });
      expect(q('a.tg-order-row__action')!.getAttribute('href')).toBe('/orders/7/review');
      set({ status: 'CONCLUIDO', reviewed: true });
      expect(q('.tg-order-row__action')).toBeNull();
    });

    it('no máximo um, e nenhum quando não é a vez da pessoa', () => {
      for (const status of ['AGUARDANDO_APROVACAO', 'AGENDADO', 'EM_ANDAMENTO', 'CANCELADO', 'REJEITADO', 'DISPUTA', 'X']) {
        set({ status }, 'customer');
        expect(row.querySelectorAll('.tg-order-row__action').length).withContext(status).toBe(0);
      }
      for (const status of ['AGUARDANDO_APROVACAO', 'AGENDADO', 'EM_DESLOCAMENTO', 'EM_ANDAMENTO']) {
        set({ status }, 'provider');
        expect(row.querySelectorAll('.tg-order-row__action').length).withContext(status).toBe(1);
      }
    });

    it('prestador: "Estou a caminho" e "Iniciar serviço" pedem a troca; a tela decide', () => {
      set({ status: 'AGENDADO' }, 'provider');
      const go = q('button.tg-order-row__action') as HTMLButtonElement;
      expect(text(go)).toBe('Estou a caminho');
      expect(go.type).toBe('button');
      expect(described(go)).toBe('Limpeza residencial');
      go.click();
      set({ status: 'EM_DESLOCAMENTO' }, 'provider');
      (q('button.tg-order-row__action') as HTMLButtonElement).click();
      expect(host.actions).toEqual(['EM_DESLOCAMENTO', 'EM_ANDAMENTO']);
      expect(text(q('tg-badge'))).toBe('A caminho');
    });

    it('carregando: botão em aria-busy e o clique não repete o pedido', () => {
      set({ status: 'AGENDADO' }, 'provider');
      host.busy.set(true);
      fixture.detectChanges();
      const go = q('button.tg-order-row__action') as HTMLButtonElement;
      expect(go.getAttribute('aria-busy')).toBe('true');
      go.click();
      expect(host.actions).toEqual([]);
      expect(text(go)).toContain('Estou a caminho');
    });

    it('prestador: links de Responder e Finalizar', () => {
      set({ status: 'AGUARDANDO_APROVACAO' }, 'provider');
      expect(q('a.tg-order-row__action')!.getAttribute('href')).toBe('/orders/7');
      set({ status: 'EM_ANDAMENTO' }, 'provider');
      expect(q('a.tg-order-row__action')!.getAttribute('href')).toBe('/orders/7/finish');
    });
  });

  it('clicar no botão não abre o pedido', () => {
    const router = TestBed.inject(Router);
    const navigate = spyOn(router, 'navigateByUrl').and.resolveTo(true);
    set({ status: 'AGENDADO' }, 'provider');
    (q('button.tg-order-row__action') as HTMLButtonElement).click();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('Tab: o serviço e depois o próximo passo; nada recebe foco sozinho', () => {
    const focusables = [...row.querySelectorAll<HTMLElement>('a[href], button, [tabindex]')].filter((n) => n.tabIndex >= 0);
    expect(focusables.map((n) => text(n))).toEqual(['Limpeza residencial', 'Pagar']);
    expect(el.contains(document.activeElement)).toBeFalse();
  });

  it('ids únicos por linha', () => {
    const ids = [...el.querySelectorAll('[id]')].map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
