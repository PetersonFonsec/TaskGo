import type { OrderModel } from '@shared/service/order/order.model';
import { tgOrderNextStep } from './tg-order-status';
import { type TgOrderSource, toTgOrderRow } from './tg-order-row.mapper';

// O pedido como as listagens da API devolvem (GET /orders do cliente e do prestador).
const api = (patch: Partial<OrderModel> = {}): OrderModel => ({
  id: '42',
  clientId: '9',
  serviceId: '3',
  status: 'CONCLUIDO',
  scheduledFor: '2026-11-18T14:00:00.000Z',
  finalPrice: null,
  client: { id: '9', name: 'Ana Souza', email: 'ana@example.com' },
  service: {
    id: '3',
    providerId: '5',
    title: 'Limpeza residencial',
    category: 'LIMPEZA',
    status: 'ATIVO',
    provider: { id: '5', user: { id: '11', name: 'Marina Souza', email: 'marina@example.com' } },
  },
  payment: { id: '1', orderId: '42', method: 'PIX', status: 'PAGO', amount: 180 as never },
  addressSnap: { id: '1', orderId: '42', street: 'Rua dos Pinheiros', number: '870', neighborhood: 'Pinheiros' },
  review: null,
  ...patch,
});

describe('toTgOrderRow (pedido da API para a linha)', () => {
  it('o modelo da API serve de entrada sem conversão de tipo', () => {
    const source: TgOrderSource = api();
    expect(source.id).toBe('42');
  });

  it('cliente: serviço, profissional, data, bairro e o status do pagamento', () => {
    expect(toTgOrderRow(api({ status: 'AGUARDANDO_PAGAMENTO', payment: { id: '1', orderId: '42', method: 'PIX', status: 'PENDENTE', amount: 180 as never } }), 'customer')).toEqual({
      id: '42',
      status: 'AGUARDANDO_PAGAMENTO',
      service: 'Limpeza residencial',
      person: 'Marina Souza',
      scheduledFor: '2026-11-18T14:00:00.000Z',
      neighborhood: 'Pinheiros',
      amount: 180,
      paymentStatus: 'PENDENTE',
      reviewed: false,
    });
  });

  it('prestador: a outra pessoa é o cliente; o valor final vence o do pagamento', () => {
    const row = toTgOrderRow(api({ finalPrice: 210 as never }), 'provider');
    expect(row.person).toBe('Ana Souza');
    expect(row.amount).toBe(210);
  });

  describe('avaliação (review)', () => {
    it('CONCLUIDO sem avaliação: Avaliar disponível', () => {
      const row = toTgOrderRow(api({ review: undefined }), 'customer');
      expect(row.reviewed).toBeFalse();
      expect(tgOrderNextStep(row, 'customer')?.label).toBe('Avaliar');
    });

    it('avaliação nula: Avaliar disponível', () => {
      const row = toTgOrderRow(api({ review: null }), 'customer');
      expect(row.reviewed).toBeFalse();
      expect(tgOrderNextStep(row, 'customer')?.label).toBe('Avaliar');
    });

    it('avaliação existente com id: sem Avaliar', () => {
      const review = { id: '77', orderId: '42', clientId: '9', providerId: '5', rating: 5 };
      const row = toTgOrderRow(api({ review }), 'customer');
      expect(row.reviewed).toBeTrue();
      expect(tgOrderNextStep(row, 'customer')).toBeNull();
    });

    it('outro status não mostra Avaliar, com ou sem avaliação', () => {
      for (const status of ['AGENDADO', 'EM_ANDAMENTO', 'CANCELADO', 'DISPUTA']) {
        for (const review of [null, { id: '77', orderId: '42', clientId: '9', providerId: '5', rating: 4 }]) {
          expect(tgOrderNextStep(toTgOrderRow(api({ status, review }), 'customer'), 'customer')?.label)
            .withContext(`${status} ${review ? 'avaliado' : 'sem avaliação'}`)
            .not.toBe('Avaliar');
        }
      }
    });
  });

  it('pagamento ausente vira null; pedido agendado e pago não pede pagamento', () => {
    expect(toTgOrderRow(api({ payment: null }), 'customer').paymentStatus).toBeNull();
    expect(toTgOrderRow(api({ payment: undefined }), 'customer').paymentStatus).toBeNull();
    expect(tgOrderNextStep(toTgOrderRow(api({ status: 'AGENDADO' }), 'customer'), 'customer')).toBeNull();
  });

  it('dados faltando não quebram: sem serviço, pessoa, endereço ou valor', () => {
    const row = toTgOrderRow(
      { id: '1', status: 'AGUARDANDO_APROVACAO', service: null, client: null, addressSnap: null, payment: null, review: null },
      'provider',
    );
    expect(row).toEqual({
      id: '1',
      status: 'AGUARDANDO_APROVACAO',
      service: 'Serviço',
      person: null,
      scheduledFor: null,
      neighborhood: null,
      amount: null,
      paymentStatus: null,
      reviewed: false,
    });
  });

  it('valor só quando é número válido (string numérica aceita; Decimal serializado não)', () => {
    expect(toTgOrderRow(api({ finalPrice: '99.5' as never }), 'provider').amount).toBe(99.5);
    expect(toTgOrderRow(api({ finalPrice: { s: 1, e: 2, d: [180] }, payment: null }), 'provider').amount).toBeNull();
    expect(toTgOrderRow(api({ finalPrice: 'abc' as never, payment: null }), 'provider').amount).toBeNull();
  });
});
