import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, ParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, Observable, of, Subject, throwError } from 'rxjs';

import { Order } from '@shared/service/order/order';
import type { OrderDetails, OrderPaymentResponse } from '@shared/service/order/order.model';
import { OrderPaymentPage } from './order-payment.page';

const inMinutes = (minutes: number) => new Date(Date.now() + minutes * 60_000).toISOString();

const details = (id = '1042'): OrderDetails => ({
  id,
  status: 'AGUARDANDO_PAGAMENTO',
  expiresAt: null,
  service: { id: '3', title: 'Instalação de chuveiro', category: 'Elétrica', estimatedPrice: 120 },
  provider: { id: '17', name: 'Bruno Lima', photoUrl: null },
  client: { id: '7', name: 'Marina Souza', photoUrl: null },
  schedule: { requestedAt: '', scheduledFor: null },
  address: null,
  payment: null,
  review: null,
  timeline: [],
  completion: { providerFinishedAt: null, providerNotes: null },
  priceAdjustmentReason: null,
  photos: [],
});

const pix = (extra: Partial<OrderPaymentResponse> = {}): OrderPaymentResponse => ({
  id: 'p1',
  paymentId: 'p1',
  orderId: '1042',
  method: 'PIX',
  status: 'PENDENTE',
  amount: 120,
  platformAmount: 18,
  providerAmount: 102,
  feePct: 0.15,
  pix: { qrCode: '000201pix', qrCodeBase64: 'data:image/png;base64,AAAA', expiresAt: inMinutes(30) },
  ...extra,
});

describe('OrderPaymentPage', () => {
  let fixture: ComponentFixture<OrderPaymentPage>;
  let el: HTMLElement;
  let orders: jasmine.SpyObj<Order>;
  let params: BehaviorSubject<ParamMap>;

  async function setup(order: Observable<OrderDetails>, payment: Observable<OrderPaymentResponse>, id = '1042') {
    orders = jasmine.createSpyObj<Order>('Order', ['getOrderDetails', 'getOrderPayment', 'createOrderPayment']);
    orders.getOrderDetails.and.returnValue(order);
    orders.getOrderPayment.and.returnValue(payment);
    params = new BehaviorSubject(convertToParamMap({ id }));
    await TestBed.configureTestingModule({
      imports: [OrderPaymentPage],
      providers: [
        provideRouter([]),
        { provide: Order, useValue: orders },
        { provide: ActivatedRoute, useValue: { paramMap: params } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(OrderPaymentPage);
    el = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  }

  const text = (node: Element | null = el) => (node?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const button = (label: string) =>
    [...el.querySelectorAll<HTMLElement>('button, a')].find((b) => text(b) === label) ?? null;
  const flush = async () => {
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const noPayment = () =>
    throwError(() => new HttpErrorResponse({ status: 404, error: { message: 'Pagamento ainda não iniciado' } }));
  const page = () => fixture.componentInstance;
  /** Abre outro pedido na mesma instância da tela, com as respostas dadas. */
  const navigate = (id: string, payment: Observable<OrderPaymentResponse>) => {
    orders.getOrderDetails.and.returnValue(of(details(id)));
    orders.getOrderPayment.and.returnValue(payment);
    params.next(convertToParamMap({ id }));
    fixture.detectChanges();
  };

  it('resumo com o total a pagar, sem taxa nem cartão', async () => {
    await setup(of(details()), noPayment());
    expect(text(el.querySelector('h1'))).toBe('Pague com Pix');
    expect(text(el.querySelector('.order-payment__total'))).toContain('Total a pagar');
    expect(text(el.querySelector('.order-payment__total'))).toContain('120,00');
    expect(text()).not.toContain('Taxa');
    expect(text()).not.toContain('Cartão');
    expect(el.querySelector('a.order-payment__back')?.getAttribute('href')).toBe('/orders/1042');
  });

  it('sem cobrança: "Gerar Pix" cria o Pix e mostra o código', async () => {
    await setup(of(details()), noPayment());
    const created = new Subject<OrderPaymentResponse>();
    orders.createOrderPayment.and.returnValue(created);
    button('Gerar Pix')!.click();
    button('Gerar Pix')!.click();
    expect(orders.createOrderPayment).toHaveBeenCalledOnceWith('1042', { method: 'PIX' });
    created.next(pix());
    fixture.detectChanges();
    expect(text(el.querySelector('.order-payment__code-value'))).toBe('000201pix');
    expect(el.querySelector('img.order-payment__qr')?.getAttribute('src')).toBe('data:image/png;base64,AAAA');
    expect(text(el.querySelector('tg-badge'))).toBe('Aguardando pagamento');
  });

  it('erro ao gerar: mostra a mensagem da API', async () => {
    await setup(of(details()), noPayment());
    orders.createOrderPayment.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 409, error: { message: 'Pedido não disponível para pagamento' } })),
    );
    button('Gerar Pix')!.click();
    fixture.detectChanges();
    expect(text()).toContain('Pedido não disponível para pagamento');
  });

  it('copiar código: usa a área de transferência e confirma no botão', async () => {
    await setup(of(details()), of(pix()));
    const write = spyOn(navigator.clipboard, 'writeText').and.resolveTo();
    button('Copiar código')!.click();
    await flush();
    expect(write).toHaveBeenCalledOnceWith('000201pix');
    expect(button('Código copiado')).not.toBeNull();
  });

  it('copiar falhou: orienta a copiar à mão', async () => {
    await setup(of(details()), of(pix()));
    spyOn(navigator.clipboard, 'writeText').and.rejectWith(new Error('negado'));
    button('Copiar código')!.click();
    await flush();
    expect(text()).toContain('Selecione o código acima e copie');
  });

  it('"Já paguei" ainda pendente: avisa; pago: confirma e leva ao pedido', async () => {
    await setup(of(details()), of(pix()));
    button('Já paguei')!.click();
    fixture.detectChanges();
    expect(text()).toContain('Ainda não recebemos o pagamento');

    orders.getOrderPayment.and.returnValue(of(pix({ status: 'PAGO' })));
    button('Já paguei')!.click();
    fixture.detectChanges();
    expect(text()).toContain('Pagamento confirmado');
    expect(button('Ver pedido')?.getAttribute('href')).toBe('/orders/1042');
    expect(button('Já paguei')).toBeNull();
  });

  it('Pix expirado: aviso com o suporte, sem código', async () => {
    await setup(of(details()), of(pix({ pix: { qrCode: '000201pix', qrCodeBase64: null, expiresAt: inMinutes(-5) } })));
    expect(text()).toContain('O código Pix expirou');
    expect(button('Falar com o suporte')?.getAttribute('href')).toBe('mailto:suporte@proxi.com.br');
    expect(el.querySelector('.order-payment__code-value')).toBeNull();
  });

  it('pagamento falhou: aviso com o suporte', async () => {
    await setup(of(details()), of(pix({ status: 'FALHOU' })));
    expect(text()).toContain('O pagamento não foi concluído');
  });

  it('pedido inexistente (404): aviso sem "Tentar de novo"', async () => {
    await setup(throwError(() => new HttpErrorResponse({ status: 404 })), noPayment());
    expect(text()).toContain('Este pedido não foi encontrado');
    expect(button('Tentar de novo')).toBeNull();
  });

  it('falha ao carregar: "Tentar de novo" recarrega', async () => {
    await setup(throwError(() => new HttpErrorResponse({ status: 500 })), noPayment());
    expect(text()).toContain('Não foi possível carregar o pagamento');
    orders.getOrderDetails.and.returnValue(of(details()));
    button('Tentar de novo')!.click();
    fixture.detectChanges();
    expect(text(el.querySelector('h1'))).toBe('Pague com Pix');
  });

  describe('consulta do pagamento', () => {
    it('HTTP 500: erro com "Tentar de novo", sem "Gerar Pix"; nova consulta mostra o Pix', async () => {
      await setup(of(details()), throwError(() => new HttpErrorResponse({ status: 500 })));
      expect(button('Gerar Pix')).toBeNull();
      expect(text()).toContain('Não foi possível carregar o pagamento');

      orders.getOrderPayment.and.returnValue(of(pix()));
      button('Tentar de novo')!.click();
      fixture.detectChanges();
      expect(text(el.querySelector('.order-payment__code-value'))).toBe('000201pix');
      expect(button('Gerar Pix')).toBeNull();
    });

    it('falha de rede (status 0) também não libera "Gerar Pix"', async () => {
      await setup(of(details()), throwError(() => new HttpErrorResponse({ status: 0 })));
      expect(button('Gerar Pix')).toBeNull();
      expect(button('Tentar de novo')).not.toBeNull();
    });

    it('404 "Pagamento ainda não iniciado": "Gerar Pix" aparece e cria a cobrança', async () => {
      await setup(of(details()), noPayment());
      expect(button('Gerar Pix')).not.toBeNull();
      orders.createOrderPayment.and.returnValue(of(pix()));
      button('Gerar Pix')!.click();
      fixture.detectChanges();
      expect(orders.createOrderPayment).toHaveBeenCalledOnceWith('1042', { method: 'PIX' });
      expect(text(el.querySelector('.order-payment__code-value'))).toBe('000201pix');
    });
  });

  describe('respostas fora de ordem', () => {
    beforeEach(() => jasmine.clock().install());
    afterEach(() => jasmine.clock().uninstall());

    it('automática antiga chega depois do "Já paguei" pago: continua "Pagamento confirmado"', async () => {
      await setup(of(details()), of(pix()));
      const auto = new Subject<OrderPaymentResponse>();
      const manual = new Subject<OrderPaymentResponse>();
      orders.getOrderPayment.and.returnValues(auto, manual);
      jasmine.clock().tick(15_000);
      button('Já paguei')!.click();

      manual.next(pix({ status: 'PAGO' }));
      fixture.detectChanges();
      expect(text()).toContain('Pagamento confirmado');

      auto.next(pix());
      fixture.detectChanges();
      expect(text()).toContain('Pagamento confirmado');
      expect(button('Já paguei')).toBeNull();
    });

    it('a resposta da primeira consulta, chegando por último, não sobrescreve a segunda', async () => {
      await setup(of(details()), of(pix()));
      const first = new Subject<OrderPaymentResponse>();
      const second = new Subject<OrderPaymentResponse>();
      orders.getOrderPayment.and.returnValues(first, second);
      jasmine.clock().tick(15_000);
      button('Já paguei')!.click();

      const fresh = pix({ pix: { qrCode: 'novo-codigo', qrCodeBase64: null, expiresAt: inMinutes(30) } });
      second.next(fresh);
      fixture.detectChanges();
      first.next(pix({ status: 'FALHOU' }));
      fixture.detectChanges();

      expect(text(el.querySelector('.order-payment__code-value'))).toBe('novo-codigo');
      expect(text()).not.toContain('O pagamento não foi concluído');
      expect(text()).toContain('Ainda não recebemos o pagamento');
    });

    it('não abre outra conferência automática enquanto uma está em curso', async () => {
      await setup(of(details()), of(pix()));
      orders.getOrderPayment.and.returnValue(new Subject<OrderPaymentResponse>());
      jasmine.clock().tick(15_000);
      jasmine.clock().tick(15_000);
      jasmine.clock().tick(15_000);
      expect(orders.getOrderPayment).toHaveBeenCalledTimes(2);
    });
  });

  describe('navegação entre pedidos', () => {
    it('A → B com "Gerar Pix" em curso: B livre, e a resposta de A não muda B', async () => {
      await setup(of(details('A')), noPayment(), 'A');
      const createdA = new Subject<OrderPaymentResponse>();
      orders.createOrderPayment.and.returnValue(createdA);
      button('Gerar Pix')!.click();
      expect(page().creating()).toBeTrue();

      navigate('B', noPayment());
      expect(page().creating()).toBeFalse();

      createdA.next(pix({ orderId: 'A', pix: { qrCode: 'codigo-de-A', qrCodeBase64: null, expiresAt: inMinutes(30) } }));
      fixture.detectChanges();
      expect(page().payment()).toBeNull();
      expect(page().creating()).toBeFalse();
      expect(text()).not.toContain('codigo-de-A');
      expect(button('Gerar Pix')).not.toBeNull();
    });

    it('erro na criação de A depois de abrir B: nenhuma mensagem de A em B, e B gera o próprio Pix', async () => {
      await setup(of(details('A')), noPayment(), 'A');
      const createdA = new Subject<OrderPaymentResponse>();
      orders.createOrderPayment.and.returnValue(createdA);
      button('Gerar Pix')!.click();

      navigate('B', noPayment());
      createdA.error(new HttpErrorResponse({ status: 409, error: { message: 'Erro do pedido A' } }));
      fixture.detectChanges();
      expect(text()).not.toContain('Erro do pedido A');
      expect(page().actionError()).toBe('');

      orders.createOrderPayment.and.returnValue(of(pix({ orderId: 'B' })));
      button('Gerar Pix')!.click();
      fixture.detectChanges();
      expect(orders.createOrderPayment).toHaveBeenCalledWith('B', { method: 'PIX' });
      expect(text(el.querySelector('.order-payment__code-value'))).toBe('000201pix');
    });

    it('"Já paguei" de A termina depois de abrir B: B não muda', async () => {
      await setup(of(details('A')), of(pix({ orderId: 'A' })), 'A');
      const checkA = new Subject<OrderPaymentResponse>();
      orders.getOrderPayment.and.returnValue(checkA);
      button('Já paguei')!.click();
      expect(page().checking()).toBeTrue();

      const paymentB = pix({ orderId: 'B', pix: { qrCode: 'codigo-de-B', qrCodeBase64: null, expiresAt: inMinutes(30) } });
      navigate('B', of(paymentB));
      expect(page().checking()).toBeFalse();

      checkA.next(pix({ orderId: 'A', status: 'PAGO' }));
      fixture.detectChanges();
      expect(page().checking()).toBeFalse();
      expect(page().stillPending()).toBeFalse();
      expect(page().payment()).toBe(paymentB);
      expect(text()).not.toContain('Pagamento confirmado');
    });

    it('A → B → A: a conferência antiga de A não muda o A aberto de novo', async () => {
      await setup(of(details('A')), of(pix({ orderId: 'A' })), 'A');
      const oldCheck = new Subject<OrderPaymentResponse>();
      orders.getOrderPayment.and.returnValue(oldCheck);
      button('Já paguei')!.click();

      navigate('B', noPayment());
      const freshA = pix({ orderId: 'A' });
      navigate('A', of(freshA));
      expect(page().checking()).toBeFalse();

      oldCheck.next(pix({ orderId: 'A', status: 'PAGO' }));
      fixture.detectChanges();
      expect(page().payment()).toBe(freshA);
      expect(page().checking()).toBeFalse();
      expect(text()).not.toContain('Pagamento confirmado');
      expect(button('Já paguei')).not.toBeNull();
    });

    it('cópia de A que termina depois de abrir B não muda B (sucesso ou falha)', async () => {
      await setup(of(details('A')), of(pix({ orderId: 'A' })), 'A');
      let resolve!: () => void;
      let reject!: (error: Error) => void;
      const write = spyOn(navigator.clipboard, 'writeText');

      write.and.returnValue(new Promise<void>((ok) => (resolve = ok)));
      button('Copiar código')!.click();
      navigate('B', of(pix({ orderId: 'B' })));
      resolve();
      await flush();
      expect(page().copyState()).toBe('idle');
      expect(button('Código copiado')).toBeNull();
      expect(button('Copiar código')).not.toBeNull();

      write.and.returnValue(new Promise<void>((_, no) => (reject = no)));
      button('Copiar código')!.click();
      navigate('C', of(pix({ orderId: 'C' })));
      reject(new Error('negado'));
      await flush();
      expect(page().copyState()).toBe('idle');
      expect(text()).not.toContain('Selecione o código acima e copie');
    });

    it('o timer da cópia de A não apaga a confirmação de B', async () => {
      jasmine.clock().install();
      try {
        await setup(of(details('A')), of(pix({ orderId: 'A' })), 'A');
        spyOn(navigator.clipboard, 'writeText').and.resolveTo();
        await page().copyCode();
        expect(page().copyState()).toBe('copied');

        navigate('B', of(pix({ orderId: 'B' })));
        expect(page().copyState()).toBe('idle');
        jasmine.clock().tick(2_000);
        await page().copyCode();
        expect(page().copyState()).toBe('copied');
        jasmine.clock().tick(1_500);
        expect(page().copyState()).withContext('o timer de A já teria disparado').toBe('copied');
        jasmine.clock().tick(1_500);
        expect(page().copyState()).toBe('idle');
      } finally {
        jasmine.clock().uninstall();
      }
    });
  });

  describe('conferência automática', () => {
    beforeEach(() => jasmine.clock().install());
    afterEach(() => jasmine.clock().uninstall());

    it('a cada 15 s, só enquanto o Pix está pendente', async () => {
      await setup(of(details()), of(pix()));
      expect(orders.getOrderPayment).toHaveBeenCalledTimes(1);
      jasmine.clock().tick(15_000);
      expect(orders.getOrderPayment).toHaveBeenCalledTimes(2);

      orders.getOrderPayment.and.returnValue(of(pix({ status: 'PAGO' })));
      jasmine.clock().tick(15_000);
      fixture.detectChanges();
      expect(text()).toContain('Pagamento confirmado');
      jasmine.clock().tick(45_000);
      expect(orders.getOrderPayment).toHaveBeenCalledTimes(3);
    });

    it('sem cobrança, não consulta sozinha', async () => {
      await setup(of(details()), noPayment());
      jasmine.clock().tick(60_000);
      expect(orders.getOrderPayment).toHaveBeenCalledTimes(1);
    });
  });
});
