import {
  OrderDisputesController,
  AdminOrderDisputesController,
} from './order-disputes.controller';
import { ADMIN_ACTOR_KEY } from '../admin/auth/admin-actor';

describe('Order disputes', () => {
  const actor = { id: '2', role: 'CLIENTE' as const };
  const body = {
    reason: 'Serviço incompleto',
    description: 'O atendimento combinado não foi concluído.',
  };
  function setup() {
    const tx: any = {
      $queryRaw: jest.fn(),
      order: {
        findFirst: jest.fn().mockResolvedValue({
          id: 1n,
          status: 'AGUARDANDO_CONFIRMACAO_CLIENTE',
        }),
      },
      orderDispute: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 5n }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    tx.$transaction = jest.fn((callback) => callback(tx));
    return { tx, controller: new OrderDisputesController(tx) };
  }
  it('checks participation and stores the authenticated author', async () => {
    const { tx, controller } = setup();
    await controller.open(1n, body, actor);
    expect(tx.order.findFirst).toHaveBeenCalledWith({
      where: {
        id: 1n,
        OR: [{ clientId: 2n }, { service: { providerId: 2n } }],
      },
    });
    expect(tx.orderDispute.create).toHaveBeenCalledWith({
      data: {
        orderId: 1n,
        openedBy: 'CLIENTE',
        openedById: 2n,
        ...body,
        status: 'OPEN',
      },
    });
  });
  it('rejects unrelated accounts without writing', async () => {
    const { tx, controller } = setup();
    tx.order.findFirst.mockResolvedValue(null);
    await expect(controller.open(1n, body, actor)).rejects.toThrow(
      'não encontrado',
    );
    expect(tx.orderDispute.create).not.toHaveBeenCalled();
  });
  it('returns the existing active case on retry', async () => {
    const { tx, controller } = setup();
    tx.orderDispute.findFirst.mockResolvedValue({ id: 5n });
    expect(await controller.open(1n, body, actor)).toEqual({ id: 5n });
    expect(tx.orderDispute.create).not.toHaveBeenCalled();
  });
  it('rejects cases after confirmation', async () => {
    const { tx, controller } = setup();
    tx.order.findFirst.mockResolvedValue({ id: 1n, status: 'CONCLUIDO' });
    await expect(controller.open(1n, body, actor)).rejects.toThrow(
      'antes da confirmação',
    );
  });
  it('records the administrative decision without modifying payment', async () => {
    const { tx } = setup();
    await new AdminOrderDisputesController(tx).resolve(
      5n,
      { status: 'RESOLVED', resolution: 'Acordo documentado com as partes.' },
      { [ADMIN_ACTOR_KEY]: { id: 7n } } as any,
    );
    expect(tx.orderDispute.updateMany).toHaveBeenCalledWith({
      where: { id: 5n, status: { in: ['OPEN', 'UNDER_REVIEW'] } },
      data: {
        status: 'RESOLVED',
        resolution: 'Acordo documentado com as partes.',
        resolvedById: 7n,
        resolvedAt: expect.any(Date),
      },
    });
  });
});
