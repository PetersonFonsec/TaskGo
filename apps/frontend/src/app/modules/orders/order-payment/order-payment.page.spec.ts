import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { Observable, of, Subject, throwError } from 'rxjs';

import { Order } from '@shared/service/order/order';
import type { OrderDetails, OrderPaymentResponse } from '@shared/service/order/order.model';
import { OrderPaymentPage } from './order-payment.page';

const inMinutes = (minutes: number) => new Date(Date.now() + minutes * 60_000).toISOString();

const details = (): OrderDetails => ({
  id: '1042',
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

  async function setup(order: Observable<OrderDetails>, payment: Observable<OrderPaymentResponse>) {
    orders = jasmine.createSpyObj<Order>('Order', ['getOrderDetails', 'getOrderPayment', 'createOrderPayment']);
    orders.getOrderDetails.and.returnValue(order);
    orders.getOrderPayment.and.returnValue(payment);
    await TestBed.configureTestingModule({
      imports: [OrderPaymentPage],
      providers: [
        provideRouter([]),
        { provide: Order, useValue: orders },
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: '1042' })) } },
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
  const noPayment = () => throwError(() => new HttpErrorResponse({ status: 404 }));

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
