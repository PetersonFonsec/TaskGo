import type { OrderModel } from '@shared/service/order/order.model';
import { tgOrderNextStep } from '../order-row/tg-order-status';
import { type TgAppointmentSource, toTgAppointment } from './tg-appointment-card.mapper';

const api = (patch: Partial<OrderModel> = {}): OrderModel => ({
  id: '42',
  clientId: '9',
  serviceId: '3',
  status: 'AGUARDANDO_PAGAMENTO',
  scheduledFor: '2026-11-18T14:00:00.000Z',
  client: { id: '9', name: 'Ana Souza', email: 'ana@example.com', photoUrl: 'https://cdn.example/ana.jpg' },
  service: {
    id: '3',
    providerId: '5',
    title: 'Instalação de chuveiro',
    category: 'REPAROS',
    status: 'ATIVO',
    provider: { id: '5', user: { id: '11', name: 'Marina Souza', email: 'marina@example.com', photoUrl: ' ' } },
  },
  payment: { id: '1', orderId: '42', method: 'PIX', status: 'PENDENTE', amount: 120 as never },
  addressSnap: { id: '1', orderId: '42', street: 'Rua Harmonia', number: '123', complement: 'apto 41', neighborhood: 'Vila Madalena' },
  review: null,
  ...patch,
});

describe('toTgAppointment (pedido da API para o card)', () => {
  it('o modelo da API serve de entrada sem conversão de tipo', () => {
    const source: TgAppointmentSource = api();
    expect(source.id).toBe('42');
  });

  it('cliente: endereço completo, profissional sem foto válida e Ver QR Code', () => {
    const card = toTgAppointment(api(), 'customer');
    expect(card).toEqual({
      id: '42',
      status: 'AGUARDANDO_PAGAMENTO',
      service: 'Instalação de chuveiro',
      person: 'Marina Souza',
      personPhotoUrl: null,
      scheduledFor: '2026-11-18T14:00:00.000Z',
      address: 'Rua Harmonia, 123, apto 41',
      neighborhood: 'Vila Madalena',
      amount: 120,
      paymentStatus: 'PENDENTE',
      reviewed: false,
    });
    expect(tgOrderNextStep(card, 'customer')?.label).toBe('Ver QR Code');
  });

  it('prestador: o cliente e a foto dele', () => {
    const card = toTgAppointment(api(), 'provider');
    expect(card.person).toBe('Ana Souza');
    expect(card.personPhotoUrl).toBe('https://cdn.example/ana.jpg');
  });

  it('avaliação presente tira o Avaliar', () => {
    const review = { id: '77', orderId: '42', clientId: '9', providerId: '5', rating: 5 };
    expect(tgOrderNextStep(toTgAppointment(api({ status: 'CONCLUIDO', review }), 'customer'), 'customer')).toBeNull();
    expect(tgOrderNextStep(toTgAppointment(api({ status: 'CONCLUIDO', review: null }), 'customer'), 'customer')?.label).toBe('Avaliar');
  });

  it('endereço parcial ou ausente', () => {
    expect(toTgAppointment(api({ addressSnap: { id: '1', orderId: '42', street: 'Rua Harmonia', number: null } }), 'customer').address).toBe('Rua Harmonia');
    const empty = toTgAppointment(api({ addressSnap: null }), 'customer');
    expect(empty.address).toBeNull();
    expect(empty.neighborhood).toBeNull();
  });
});
