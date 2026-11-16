import type { OrderDetails, OrderPaymentResponse } from '@shared/service/order/order.model';
import { orderPaymentView } from './order-payment.view';

const NOW = new Date(2026, 10, 14, 9, 0);

const order = (extra: Partial<OrderDetails> = {}): OrderDetails => ({
  id: '1042',
  status: 'AGUARDANDO_PAGAMENTO',
  expiresAt: null,
  service: { id: '3', title: 'Instalação de chuveiro', category: 'Elétrica', estimatedPrice: 120 },
  provider: { id: '17', name: 'Bruno Lima', photoUrl: null },
  client: { id: '7', name: 'Marina Souza', photoUrl: null },
  schedule: { requestedAt: '', scheduledFor: new Date(2026, 10, 14, 14, 0).toISOString() },
  address: null,
  payment: null,
  review: null,
  timeline: [],
  completion: { providerFinishedAt: null, providerNotes: null },
  priceAdjustmentReason: null,
  photos: [],
  ...extra,
});

const payment = (extra: Partial<OrderPaymentResponse> = {}): OrderPaymentResponse => ({
  id: 'p1',
  paymentId: 'p1',
  orderId: '1042',
  method: 'PIX',
  status: 'PENDENTE',
  amount: 120,
  platformAmount: 18,
  providerAmount: 102,
  feePct: 0.15,
  pix: { qrCode: '000201pix', qrCodeBase64: 'https://example.test/qr.png', expiresAt: new Date(2026, 10, 14, 15, 40).toISOString() },
  ...extra,
});

const plain = (text: string | null) => text?.replace(/\s/g, ' ') ?? null;

describe('orderPaymentView', () => {
  it('resumo: serviço, prestador, quando e iniciais', () => {
    const v = orderPaymentView(order(), null, NOW);
    expect(v.title).toBe('Instalação de chuveiro');
    expect(v.detail).toBe('Bruno Lima · Hoje, 14:00');
    expect(v.initials).toBe('BL');
  });

  it('o total é o que a API cobra; a taxa não é somada', () => {
    expect(plain(orderPaymentView(order(), payment({ amount: 150 }), NOW).total)).toBe('R$ 150,00');
    expect(plain(orderPaymentView(order(), null, NOW).total)).toBe('R$ 120,00');
    const final = order({ payment: { method: 'PIX', status: 'CREATED', estimatedAmount: 120, finalAmount: 130 } });
    expect(plain(orderPaymentView(final, null, NOW).total)).toBe('R$ 130,00');
  });

  it('sem cobrança ou CREATED: "none"', () => {
    expect(orderPaymentView(order(), null, NOW).pix).toBe('none');
    expect(orderPaymentView(order(), payment({ status: 'CREATED' }), NOW).pix).toBe('none');
  });

  it('pendente e válido: código, imagem e validade', () => {
    const v = orderPaymentView(order(), payment(), NOW);
    expect(v.pix).toBe('pending');
    expect(v.code).toBe('000201pix');
    expect(v.qrImage).toBe('https://example.test/qr.png');
    expect(v.validUntil).toBe('15:40');
  });

  it('pendente com o prazo vencido: "expired", sem código', () => {
    const v = orderPaymentView(order(), payment(), new Date(2026, 10, 14, 16, 0));
    expect(v.pix).toBe('expired');
    expect(v.code).toBeNull();
  });

  it('pago ou autorizado: "paid"', () => {
    for (const status of ['PAGO', 'AUTORIZADO', 'CAPTURED', 'AUTHORIZED', 'RELEASED']) {
      expect(orderPaymentView(order(), payment({ status }), NOW).pix).withContext(status).toBe('paid');
    }
  });

  it('falhou, cancelado, reembolsado, desconhecido ou pendente sem código: "unavailable"', () => {
    for (const status of ['FALHOU', 'CANCELADO', 'REEMBOLSADO', 'XYZ']) {
      expect(orderPaymentView(order(), payment({ status }), NOW).pix).withContext(status).toBe('unavailable');
    }
    const noCode = payment({ pix: { qrCode: null, qrCodeBase64: null, expiresAt: null } });
    expect(orderPaymentView(order(), noCode, NOW).pix).toBe('unavailable');
  });
});
