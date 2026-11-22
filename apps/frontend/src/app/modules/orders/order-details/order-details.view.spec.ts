import type { OrderDetails } from '@shared/service/order/order.model';
import { orderDetailsView, orderExpiryNotice } from './order-details.view';

const NOW = new Date('2026-11-14T09:00:00-03:00');

function details(extra: Partial<OrderDetails> = {}): OrderDetails {
  return {
    id: '1042',
    status: 'AGENDADO',
    expiresAt: null,
    service: { id: '3', title: 'Instalação de chuveiro', category: 'Elétrica', estimatedPrice: 120 },
    provider: { id: '17', name: 'Bruno Lima', photoUrl: null, ratingAvg: 4.8, ratingCount: 32, verified: true },
    client: { id: '7', name: 'Marina Souza', photoUrl: null },
    schedule: { requestedAt: '2026-11-12T13:02:00.000Z', scheduledFor: new Date(2026, 10, 14, 14, 0).toISOString() },
    address: {
      street: 'Rua Harmonia',
      number: '123',
      complement: 'apto 41',
      neighborhood: 'Vila Madalena',
      city: 'São Paulo',
      state: 'SP',
      cep: '05435-000',
    },
    distanceKm: 3.2,
    providerEarnings: { grossAmount: 120, feePct: 0.15, feeAmount: 18, netAmount: 102 },
    cancellation: null,
    payment: { method: 'PIX', status: 'PAGO', estimatedAmount: 120, finalAmount: null },
    review: null,
    timeline: [],
    completion: { providerFinishedAt: null, providerNotes: null },
    priceAdjustmentReason: null,
    photos: [],
    ...extra,
  };
}

const plain = (text: string) => text.replace(/\s/g, ' ');

describe('orderDetailsView', () => {
  it('título, linha de cima, quando e status pelo mapa do DS', () => {
    const v = orderDetailsView(details(), 'customer', NOW);
    expect(v.title).toBe('Instalação de chuveiro');
    expect(v.eyebrow).toBe('Pedido #1042 · Elétrica');
    expect(v.when).toEqual({ day: 'Hoje', time: '14:00' });
    expect(v.status).toEqual({ label: 'Agendado', tone: 'confirmed', icon: 'calendar-blank' });
    expect(v.requested).toContain('Solicitado em 12 de novembro de 2026');
  });

  it('status desconhecido vira "Em atualização", nunca o código cru', () => {
    const v = orderDetailsView(details({ status: 'NOVO_STATUS' }), 'customer', NOW);
    expect(v.status.label).toBe('Em atualização');
    expect(v.step).toBeNull();
  });

  it('sem data marcada: "Data a combinar" e sem hora', () => {
    const v = orderDetailsView(details({ schedule: { requestedAt: '', scheduledFor: null } }), 'customer', NOW);
    expect(v.when).toEqual({ day: 'Data a combinar', time: '' });
    expect(v.requested).toBeNull();
  });

  it('o cliente vê o prestador, com verificado e nota', () => {
    const { person } = orderDetailsView(details(), 'customer', NOW);
    expect(person.role).toBe('Prestador');
    expect(person.name).toBe('Bruno Lima');
    expect(person.initials).toBe('BL');
    expect(person.verified).toBeTrue();
    expect(person.rating).toBe('4,8 (32 avaliações)');
  });

  it('o prestador vê o cliente, sem nota nem verificado', () => {
    const { person } = orderDetailsView(details(), 'provider', NOW);
    expect(person.role).toBe('Cliente');
    expect(person.name).toBe('Marina Souza');
    expect(person.verified).toBeFalse();
    expect(person.rating).toBeNull();
  });

  it('endereço completo; a distância só para o prestador', () => {
    const customer = orderDetailsView(details(), 'customer', NOW);
    expect(customer.address).toBe('Rua Harmonia, 123, apto 41 · Vila Madalena');
    expect(customer.addressDetail).toBe('São Paulo / SP · CEP 05435-000');
    const provider = orderDetailsView(details(), 'provider', NOW);
    expect(provider.addressDetail).toBe('São Paulo / SP · CEP 05435-000 · 3,2 km de você');
  });

  it('sem endereço: nada de "não informado"', () => {
    const v = orderDetailsView(details({ address: null, distanceKm: null }), 'provider', NOW);
    expect(v.address).toBeNull();
    expect(v.addressDetail).toBeNull();
  });

  it('pagamento com forma e situação em português', () => {
    const v = orderDetailsView(details(), 'customer', NOW);
    expect(v.payment.map((r) => [r.label, plain(r.value)])).toEqual([
      ['Valor estimado', 'R$ 120,00'],
      ['Forma de pagamento', 'Pix'],
      ['Situação', 'Pago'],
    ]);
    const unknown = orderDetailsView(
      details({ payment: { method: 'BOLETO', status: 'XYZ', estimatedAmount: 120, finalAmount: 150 } }),
      'customer',
      NOW,
    );
    expect(unknown.payment.map((r) => [r.label, plain(r.value)])).toEqual([
      ['Valor final', 'R$ 150,00'],
      ['Situação', 'Em atualização'],
    ]);
  });

  it('a parte do prestador e a taxa só para ele; estimada até o valor final', () => {
    expect(orderDetailsView(details(), 'customer', NOW).earnings).toEqual([]);
    const v = orderDetailsView(details(), 'provider', NOW);
    expect(v.earnings.map((r) => [r.label, plain(r.value)])).toEqual([
      ['Sua parte (estimada)', 'R$ 102,00'],
      ['Taxa da plataforma', '15% · R$ 18,00'],
    ]);
    const final = orderDetailsView(
      details({ payment: { method: 'PIX', status: 'PAGO', estimatedAmount: 120, finalAmount: 120 } }),
      'provider',
      NOW,
    );
    expect(final.earnings[0].label).toBe('Sua parte');
  });

  it('próximo passo do DS: Pagar, Ver QR Code, Confirmar conclusão com Reportar problema, Avaliar', () => {
    const pay = orderDetailsView(details({ status: 'AGUARDANDO_PAGAMENTO', payment: null }), 'customer', NOW);
    expect(pay.step?.label).toBe('Pagar');
    const qr = orderDetailsView(
      details({ status: 'AGUARDANDO_PAGAMENTO', payment: { method: 'PIX', status: 'PENDENTE', estimatedAmount: 120, finalAmount: null } }),
      'customer',
      NOW,
    );
    expect(qr.step?.label).toBe('Ver QR Code');
    expect(qr.step?.link).toEqual(['/orders', '1042', 'payment']);
    const confirm = orderDetailsView(details({ status: 'AGUARDANDO_CONFIRMACAO_CLIENTE' }), 'customer', NOW);
    expect(confirm.step?.label).toBe('Confirmar conclusão');
    expect(confirm.reportLink).toEqual(['/orders', '1042', 'report-problem']);
    const review = orderDetailsView(details({ status: 'CONCLUIDO' }), 'customer', NOW);
    expect(review.step?.label).toBe('Avaliar');
    const reviewed = orderDetailsView(
      details({ status: 'CONCLUIDO', review: { id: 'r', rating: 5, comment: null, reviewedAt: '' } }),
      'customer',
      NOW,
    );
    expect(reviewed.step).toBeNull();
  });

  it('o agendado já pago não pede pagamento ao cliente', () => {
    expect(orderDetailsView(details(), 'customer', NOW).step).toBeNull();
  });

  it('próximo passo do prestador e link para reportar nas etapas permitidas', () => {
    expect(orderDetailsView(details(), 'provider', NOW).step).toEqual({ label: 'Estou a caminho', action: 'EM_DESLOCAMENTO' });
    expect(orderDetailsView(details({ status: 'EM_DESLOCAMENTO' }), 'provider', NOW).step?.action).toBe('EM_ANDAMENTO');
    expect(orderDetailsView(details({ status: 'EM_ANDAMENTO' }), 'provider', NOW).step?.link).toEqual([
      '/orders',
      '1042',
      'finish',
    ]);
    expect(orderDetailsView(details({ status: 'EM_ANDAMENTO' }), 'provider', NOW).reportLink).toEqual([
      '/orders', '1042', 'report-problem',
    ]);
    expect(orderDetailsView(details({ status: 'AGUARDANDO_CONFIRMACAO_CLIENTE' }), 'provider', NOW).reportLink).toEqual([
      '/orders', '1042', 'report-problem',
    ]);
    expect(orderDetailsView(details({ status: 'EM_ANDAMENTO' }), 'customer', NOW).reportLink).toEqual([
      '/orders', '1042', 'report-problem',
    ]);
    expect(orderDetailsView(details({ status: 'CONCLUIDO' }), 'provider', NOW).reportLink).toBeNull();
  });

  it('conclusão: observações, ajuste de preço e avaliação válida', () => {
    const v = orderDetailsView(
      details({
        status: 'CONCLUIDO',
        completion: { providerFinishedAt: '2026-11-14T18:00:00Z', providerNotes: ' Troquei o registro. ' },
        priceAdjustmentReason: 'Peça extra',
        review: { id: 'r', rating: 5, comment: 'Ótimo', reviewedAt: '' },
      }),
      'provider',
      NOW,
    );
    expect(v.completion).toEqual([
      { label: 'Observações do prestador', value: 'Troquei o registro.' },
      { label: 'Motivo do ajuste de preço', value: 'Peça extra' },
    ]);
    expect(v.review).toEqual({ rating: 5, comment: 'Ótimo' });
    const invalid = orderDetailsView(details({ review: { id: 'r', rating: 9, comment: null, reviewedAt: '' } }), 'provider', NOW);
    expect(invalid.review).toBeNull();
  });

  it('cancelamento pela perspectiva', () => {
    const cancellation = { reason: 'NO_AVAILABILITY' as const, label: 'Sem horário disponível', note: 'Agenda cheia', canceledAt: null };
    const customer = orderDetailsView(details({ status: 'CANCELADO', cancellation }), 'customer', NOW);
    expect(customer.cancellation).toEqual({
      title: 'O prestador não pôde atender este pedido',
      reason: 'Sem horário disponível',
      note: 'Agenda cheia',
    });
    const provider = orderDetailsView(details({ status: 'CANCELADO', cancellation }), 'provider', NOW);
    expect(provider.cancellation?.title).toBe('Você recusou esta solicitação');
  });
});

describe('orderExpiryNotice', () => {
  const expires = '2026-11-14T15:40:00-03:00';

  it('sem prazo: nada', () => {
    expect(orderExpiryNotice(details(), 'customer', NOW)).toBeNull();
  });

  it('pagamento: o cliente paga, o prestador espera', () => {
    const order = details({ status: 'AGUARDANDO_PAGAMENTO', expiresAt: expires });
    expect(orderExpiryNotice(order, 'customer', NOW)?.title).toBe('Pague até 15:40');
    expect(orderExpiryNotice(order, 'provider', NOW)?.title).toBe('O cliente tem até 15:40 para pagar');
  });

  it('aprovação: o prestador responde, o cliente espera', () => {
    const order = details({ status: 'AGUARDANDO_APROVACAO', expiresAt: expires });
    expect(orderExpiryNotice(order, 'provider', NOW)?.title).toBe('Responda até 15:40');
    expect(orderExpiryNotice(order, 'customer', NOW)?.title).toBe('O prestador tem até 15:40 para responder');
  });

  it('usa o fuso de São Paulo e inclui amanhã quando o prazo cruza a meia-noite', () => {
    const now = new Date('2026-11-14T23:00:00.000Z');
    const tomorrowAtLocal = details({ status: 'AGUARDANDO_APROVACAO', expiresAt: '2026-11-15T08:42:00.000Z' });
    expect(orderExpiryNotice(tomorrowAtLocal, 'provider', now)?.title).toBe('Responda até amanhã, 05:42');
    const todayAtLocal = details({ status: 'AGUARDANDO_APROVACAO', expiresAt: '2026-11-15T02:42:00.000Z' });
    expect(orderExpiryNotice(todayAtLocal, 'provider', now)?.title).toBe('Responda até 23:42');
  });

  it('prazo vencido', () => {
    const order = details({ status: 'AGUARDANDO_PAGAMENTO', expiresAt: expires });
    expect(orderExpiryNotice(order, 'customer', new Date('2026-11-14T16:00:00-03:00'))?.title).toBe('O prazo terminou');
  });
});
