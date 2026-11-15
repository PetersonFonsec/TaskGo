import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import type { TgOrderPerspective, TgOrderStatusAction } from '../order-row/tg-order-status';
import { TgAppointmentCardComponent, type TgAppointmentData } from './tg-appointment-card.component';

const today = (h: number, m = 0) => {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

const base: TgAppointmentData = {
  id: '7',
  status: 'AGUARDANDO_PAGAMENTO',
  service: 'Limpeza residencial',
  person: 'Ana Souza',
  personPhotoUrl: null,
  scheduledFor: today(14),
  address: 'Rua dos Pinheiros, 870',
  neighborhood: 'Pinheiros',
  distanceKm: 1.2,
  amount: 120,
  reviewed: false,
};

@Component({
  imports: [TgAppointmentCardComponent],
  template: `
    <tg-appointment-card
      [order]="order()"
      [perspective]="perspective()"
      [busy]="busy()"
      [headingLevel]="level()"
      [now]="now()"
      (statusAction)="actions.push($event)" />
    <tg-appointment-card [order]="other" perspective="customer" />
  `,
})
class Host {
  readonly order = signal<TgAppointmentData>(base);
  readonly perspective = signal<TgOrderPerspective>('customer');
  readonly busy = signal(false);
  readonly level = signal<unknown>(3);
  readonly now = signal<Date | null | undefined>(undefined);
  readonly other: TgAppointmentData = { id: '8', status: 'CANCELADO', service: 'Pintura' };
  readonly actions: TgOrderStatusAction[] = [];
}

const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

describe('TgAppointmentCardComponent', () => {
  let fixture: ComponentFixture<Host>;
  let host: Host;
  let el: HTMLElement;
  let card: HTMLElement;

  const set = (patch: Partial<TgAppointmentData>, perspective?: TgOrderPerspective) => {
    host.order.set({ ...base, ...patch });
    if (perspective) host.perspective.set(perspective);
    fixture.detectChanges();
  };
  const q = (sel: string) => card.querySelector<HTMLElement>(sel);
  const described = (node: Element) =>
    (node.getAttribute('aria-describedby') ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .map((id) => text(document.getElementById(id)))
      .join(' | ');

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    fixture = TestBed.createComponent(Host);
    host = fixture.componentInstance;
    el = fixture.nativeElement;
    document.body.appendChild(el);
    fixture.detectChanges();
    card = el.querySelector('tg-appointment-card')!;
  });

  afterEach(() => el.remove());

  it('é um tg-card com o serviço como link esticado para o pedido', () => {
    expect(q('tg-card')).not.toBeNull();
    const link = q('h3 a.tg-card__link')!;
    expect(text(link)).toBe('Limpeza residencial');
    expect(link.getAttribute('href')).toBe('/orders/7');
  });

  it('o link leva o status e a data como descrição', () => {
    expect(described(q('a.tg-card__link')!)).toBe('Aguardando pagamento | Hoje 14:00');
    set({ scheduledFor: null });
    expect(described(q('a.tg-card__link')!)).toBe('Aguardando pagamento | Data a combinar');
  });

  it('quando: dia e hora grandes; sem data, "Data a combinar" e sem hora', () => {
    expect(text(q('.tg-appointment-card__day'))).toBe('Hoje');
    expect(text(q('.tg-appointment-card__time'))).toBe('14:00');
    set({ scheduledFor: 'amanhã' });
    expect(text(q('.tg-appointment-card__day'))).toBe('Data a combinar');
    expect(q('.tg-appointment-card__time')).toBeNull();
  });

  it('badge com ícone do status, texto e tom de cada perspectiva', () => {
    set({ status: 'EM_DESLOCAMENTO' }, 'customer');
    expect(text(q('tg-badge'))).toBe('Profissional a caminho');
    expect(q('tg-badge')!.classList).toContain('tg-badge--progress');
    expect(q('tg-badge tg-icon svg')!.getAttribute('aria-hidden')).toBe('true');
    expect(q('tg-badge tg-icon svg')).not.toBeNull();
    set({ status: 'EM_DESLOCAMENTO' }, 'provider');
    expect(text(q('tg-badge'))).toBe('A caminho');
  });

  it('o ícone muda com o status, e o desconhecido fica sem ícone', () => {
    const paths = new Map<string, string>();
    for (const status of ['AGUARDANDO_APROVACAO', 'AGUARDANDO_CONFIRMACAO_CLIENTE', 'AGENDADO', 'EM_ANDAMENTO']) {
      set({ status });
      paths.set(status, q('tg-badge tg-icon svg')!.innerHTML);
    }
    expect(paths.get('AGUARDANDO_APROVACAO')).toBe(paths.get('AGUARDANDO_CONFIRMACAO_CLIENTE')!);
    expect(paths.get('AGENDADO')).not.toBe(paths.get('EM_ANDAMENTO')!);
    set({ status: 'PENDENTE' });
    expect(text(q('tg-badge'))).toBe('Em atualização');
    expect(q('tg-badge')!.classList).toContain('tg-badge--neutral');
    expect(q('tg-badge tg-icon')).toBeNull();
    expect(text(card)).not.toContain('PENDENTE');
  });

  it('pessoa com iniciais; foto decorativa que volta às iniciais se falhar', () => {
    expect(text(q('.tg-appointment-card__person'))).toBe('AS Ana Souza');
    expect(q('.tg-appointment-card__avatar [aria-hidden="true"]')).not.toBeNull();
    set({ personPhotoUrl: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=' });
    const img = q('.tg-appointment-card__avatar img')!;
    expect(img.getAttribute('alt')).toBe('');
    img.dispatchEvent(new Event('error'));
    fixture.detectChanges();
    expect(q('.tg-appointment-card__avatar img')).toBeNull();
    expect(text(q('.tg-appointment-card__avatar'))).toBe('AS');
    set({ person: '  ' });
    expect(q('.tg-appointment-card__person')).toBeNull();
  });

  it('endereço completo; distância e valor só para o prestador', () => {
    expect(text(q('.tg-appointment-card__place'))).toBe('Rua dos Pinheiros, 870 · Pinheiros');
    expect(q('.tg-appointment-card__amount')).toBeNull();
    set({}, 'provider');
    expect(text(q('.tg-appointment-card__place'))).toBe('Rua dos Pinheiros, 870 · Pinheiros, 1,2 km');
    expect(text(q('.tg-appointment-card__amount')).replace(/\s/g, ' ')).toBe('Valor estimado R$ 120');
    set({ address: null, neighborhood: null, distanceKm: null, amount: 0 }, 'provider');
    expect(q('.tg-appointment-card__place')).toBeNull();
    expect(q('.tg-appointment-card__amount')).toBeNull();
    set({ address: null, neighborhood: null, distanceKm: 0.8 }, 'provider');
    expect(text(q('.tg-appointment-card__place'))).toBe('0,8 km');
  });

  describe('valor e rótulo', () => {
    it('prestador: "Valor estimado" ou "Valor final" conforme a origem', () => {
      set({ amount: 120, amountKind: 'estimated' }, 'provider');
      expect(text(q('.tg-appointment-card__amount')).replace(/\s/g, ' ')).toBe('Valor estimado R$ 120');
      set({ amount: 135, amountKind: 'final' }, 'provider');
      expect(text(q('.tg-appointment-card__amount')).replace(/\s/g, ' ')).toBe('Valor final R$ 135');
      set({ amount: 120, amountKind: null }, 'provider');
      expect(text(q('.tg-appointment-card__amount'))).toContain('Valor estimado');
    });

    it('sem valor, ou para o cliente: nada', () => {
      set({ amount: null, amountKind: 'final' }, 'provider');
      expect(q('.tg-appointment-card__amount')).toBeNull();
      set({ amount: 135, amountKind: 'final' }, 'customer');
      expect(q('.tg-appointment-card__amount')).toBeNull();
    });
  });

  describe('distância', () => {
    it('prestador: só com valor válido; zero aparece', () => {
      set({ address: null, neighborhood: 'Pinheiros', distanceKm: 0 }, 'provider');
      expect(text(q('.tg-appointment-card__place'))).toBe('Pinheiros, 0,0 km');
      for (const distanceKm of [null, undefined, -1, NaN, Infinity]) {
        set({ address: null, neighborhood: 'Pinheiros', distanceKm }, 'provider');
        expect(text(q('.tg-appointment-card__place'))).withContext(String(distanceKm)).toBe('Pinheiros');
      }
    });

    it('cliente nunca vê a distância', () => {
      set({ address: null, neighborhood: 'Pinheiros', distanceKm: 1.2 }, 'customer');
      expect(text(q('.tg-appointment-card__place'))).toBe('Pinheiros');
    });
  });

  describe('data relativa com hora de referência da tela', () => {
    const at = (d: number, h: number, m = 0) => new Date(2026, 10, d, h, m);

    it('hoje, amanhã, sem data e inválida', () => {
      host.now.set(at(15, 16));
      set({ scheduledFor: at(15, 14) });
      expect(text(q('.tg-appointment-card__when'))).toBe('Hoje 14:00');
      set({ scheduledFor: at(16, 9, 30) });
      expect(text(q('.tg-appointment-card__when'))).toBe('Amanhã 09:30');
      set({ scheduledFor: null });
      expect(text(q('.tg-appointment-card__when'))).toBe('Data a combinar');
      set({ scheduledFor: 'amanhã' });
      expect(text(q('.tg-appointment-card__when'))).toBe('Data a combinar');
    });

    it('a mudança da referência atualiza o card sem recriá-lo', () => {
      set({ scheduledFor: at(16, 9, 30) });
      host.now.set(at(15, 23, 59));
      fixture.detectChanges();
      const before = q('.tg-appointment-card__when');
      expect(text(before)).toBe('Amanhã 09:30');
      host.now.set(at(16, 0, 1));
      fixture.detectChanges();
      expect(text(q('.tg-appointment-card__when'))).toBe('Hoje 09:30');
      expect(q('.tg-appointment-card__when')).toBe(before);
      expect(described(q('a.tg-card__link')!)).toContain('Hoje 09:30');
    });
  });

  describe('próximo passo', () => {
    it('cliente: link médio com o serviço como descrição; sem passo, sem rodapé', () => {
      const pay = q('a.tg-appointment-card__action')!;
      expect(text(pay)).toBe('Pagar');
      expect(pay.getAttribute('href')).toBe('/orders/7/payment');
      expect(pay.classList).not.toContain('tg-button--sm');
      expect(described(pay)).toBe('Limpeza residencial');
      set({ status: 'CONCLUIDO', reviewed: true });
      expect(q('.tg-appointment-card__step')).toBeNull();
      set({ status: 'EM_DESLOCAMENTO' });
      expect(q('.tg-appointment-card__step')).toBeNull();
    });

    it('pagamento pelo estado do pagamento: Pagar, Ver QR Code ou nada', () => {
      set({ status: 'AGUARDANDO_PAGAMENTO', paymentStatus: 'PENDENTE' });
      expect(text(q('a.tg-appointment-card__action'))).toBe('Ver QR Code');
      expect(q('a.tg-appointment-card__action')!.getAttribute('href')).toBe('/orders/7/payment');
      set({ status: 'AGUARDANDO_PAGAMENTO', paymentStatus: 'CREATED' });
      expect(text(q('a.tg-appointment-card__action'))).toBe('Pagar');
      for (const paymentStatus of ['AUTORIZADO', 'PAGO', 'FALHOU', 'DESCONHECIDO']) {
        set({ status: 'AGUARDANDO_PAGAMENTO', paymentStatus });
        expect(q('.tg-appointment-card__step')).withContext(paymentStatus).toBeNull();
      }
      set({ status: 'AGENDADO', paymentStatus: 'PENDENTE' });
      expect(q('.tg-appointment-card__step')).toBeNull();
    });

    it('prestador: "Estou a caminho" e "Iniciar serviço" pedem a troca', () => {
      set({ status: 'AGENDADO' }, 'provider');
      const go = q('button.tg-appointment-card__action') as HTMLButtonElement;
      expect(text(go)).toBe('Estou a caminho');
      expect(go.type).toBe('button');
      go.click();
      set({ status: 'EM_DESLOCAMENTO' }, 'provider');
      (q('button.tg-appointment-card__action') as HTMLButtonElement).click();
      expect(host.actions).toEqual(['EM_DESLOCAMENTO', 'EM_ANDAMENTO']);
      set({ status: 'EM_ANDAMENTO' }, 'provider');
      expect(q('a.tg-appointment-card__action')!.getAttribute('href')).toBe('/orders/7/finish');
    });

    it('carregando: aria-busy e o clique não repete o pedido', () => {
      set({ status: 'AGENDADO' }, 'provider');
      host.busy.set(true);
      fixture.detectChanges();
      const go = q('button.tg-appointment-card__action') as HTMLButtonElement;
      expect(go.getAttribute('aria-busy')).toBe('true');
      go.click();
      expect(host.actions).toEqual([]);
    });

    it('clicar no botão não abre o pedido', () => {
      const navigate = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
      set({ status: 'AGENDADO' }, 'provider');
      (q('button.tg-appointment-card__action') as HTMLButtonElement).click();
      expect(navigate).not.toHaveBeenCalled();
    });
  });

  it('nível do título de 2 a 6; outro valor vira h3', () => {
    for (const [level, tag] of [[2, 'H2'], [6, 'H6'], [1, 'H3'], [7, 'H3'], ['x', 'H3'], [2.5, 'H3']] as const) {
      host.level.set(level);
      fixture.detectChanges();
      expect(q('.tg-appointment-card__title')!.tagName).withContext(String(level)).toBe(tag);
      expect(q('.tg-appointment-card__title a.tg-card__link')).not.toBeNull();
    }
  });

  it('Tab: o serviço e depois o próximo passo; nada recebe foco sozinho', () => {
    const focusables = [...card.querySelectorAll<HTMLElement>('a[href], button, [tabindex]')].filter((n) => n.tabIndex >= 0);
    expect(focusables.map((n) => text(n))).toEqual(['Limpeza residencial', 'Pagar']);
    expect(el.contains(document.activeElement)).toBeFalse();
  });

  it('ids únicos entre cards, com referências válidas no mesmo card', () => {
    const ids = [...el.querySelectorAll('[id]')].map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
    set({ status: 'AGENDADO' }, 'provider');
    for (const n of el.querySelectorAll('[aria-describedby]')) {
      for (const id of n.getAttribute('aria-describedby')!.split(/\s+/)) {
        expect(document.getElementById(id)?.closest('tg-appointment-card')).withContext(id).toBe(n.closest('tg-appointment-card'));
      }
    }
  });

  it('cada aplicação começa do zero (SSR por requisição e hidratação no cliente)', () => {
    const first = [...el.querySelectorAll('a.tg-card__link')].map((a) => a.id);
    el.remove();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const again = TestBed.createComponent(Host);
    again.detectChanges();
    expect([...again.nativeElement.querySelectorAll('a.tg-card__link')].map((a: Element) => a.id)).toEqual(first);
    again.destroy();
  });
});
