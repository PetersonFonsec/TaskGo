import { ListServicesHandler } from './list-services.handler';
import { ListServicesQuery } from './list-services.query';

describe('ListServicesHandler', () => {
  it('delegates pagination with the service allowlists', async () => {
    const prisma: any = {
      service: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([{ id: 1n }]),
      },
    };
    const handler = new ListServicesHandler(prisma);

    await expect(
      handler.execute(
        new ListServicesQuery({ page: 2, limit: 10, sortBy: 'title' }),
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        data: [{ id: 1n }],
        meta: expect.objectContaining({ page: 2, limit: 10 }),
      }),
    );
    expect(prisma.service.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { title: 'desc' },
        skip: 10,
        take: 10,
      }),
    );
  });
});
