import { ProviderStatus } from '@prisma/client';

import { AdminProvidersController } from './admin-providers.controller';
import { AdminProvidersService } from './admin-providers.service';

describe('AdminProvidersController', () => {
  let controller: AdminProvidersController;
  let service: {
    approve: jest.Mock;
    block: jest.Mock;
    getDetails: jest.Mock;
    getHistory: jest.Mock;
    list: jest.Mock;
    reject: jest.Mock;
    unblock: jest.Mock;
  };
  const request: any = {
    adminActor: {
      id: BigInt(1),
      role: 'ADMINISTRATOR',
    },
    headers: {},
    ip: '127.0.0.1',
    requestId: 'req-controller',
  };

  beforeEach(() => {
    service = {
      approve: jest.fn().mockResolvedValue({ provider: { id: '10' } }),
      block: jest.fn().mockResolvedValue({ provider: { id: '10' } }),
      list: jest.fn().mockResolvedValue({ data: [], meta: { total: 0 } }),
      getDetails: jest.fn().mockResolvedValue({ provider: { id: '10' } }),
      getHistory: jest.fn().mockResolvedValue({ data: [] }),
      reject: jest.fn().mockResolvedValue({ provider: { id: '10' } }),
      unblock: jest.fn().mockResolvedValue({ provider: { id: '10' } }),
    };

    controller = new AdminProvidersController(
      service as unknown as AdminProvidersService,
    );
  });

  it('delegates queue reads with filters', async () => {
    const query = {
      status: ProviderStatus.PENDING,
      submittedFrom: '2026-07-01T00:00:00.000Z',
      limit: 25,
    };

    await controller.list(query);

    expect(service.list).toHaveBeenCalledWith(query);
  });

  it('delegates provider detail reads', async () => {
    await controller.getDetails('10');

    expect(service.getDetails).toHaveBeenCalledWith('10');
  });

  it('delegates provider history reads with pagination', async () => {
    const query = { page: 2, limit: 10 };

    await controller.getHistory('10', query);

    expect(service.getHistory).toHaveBeenCalledWith('10', query);
  });

  it('delegates provider approve command with actor and audit context', async () => {
    await controller.approve('10', request);

    expect(service.approve).toHaveBeenCalledWith(
      '10',
      request.adminActor,
      expect.objectContaining({ requestId: 'req-controller' }),
    );
  });

  it.each([
    ['reject', { reason: 'Missing document' }],
    ['block', { reason: 'Operational risk' }],
    ['unblock', { reason: 'Cleared review' }],
  ] as const)(
    'delegates provider %s command with reason',
    async (method, body) => {
      await controller[method]('10', body, request);

      expect(service[method]).toHaveBeenCalledWith(
        '10',
        body,
        request.adminActor,
        expect.objectContaining({ requestId: 'req-controller' }),
      );
    },
  );
});
