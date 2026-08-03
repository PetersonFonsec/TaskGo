import { PaginationDelegate, PaginationService } from './pagination.service';

describe('PaginationService', () => {
  const delegate = {
    count: jest.fn().mockResolvedValue(21),
    findMany: jest.fn().mockResolvedValue([{ id: 1n }]),
  };
  const service = new PaginationService(
    delegate as PaginationDelegate<{ id: bigint }>,
    {
      defaultSortBy: 'id',
      allowedSortFields: ['id', 'name'],
      allowedSearchFields: ['name'],
    },
  );

  beforeEach(() => jest.clearAllMocks());

  it('uses positive bounded pagination with stable metadata', async () => {
    await expect(
      service.listPaginated({ page: 2, limit: 10 }),
    ).resolves.toEqual({
      data: [{ id: 1n }],
      meta: {
        total: 21,
        page: 2,
        limit: 10,
        totalPages: 3,
        hasPrevPage: true,
        hasNextPage: true,
      },
    });
    expect(delegate.findMany).toHaveBeenCalledWith({
      where: {},
      orderBy: { id: 'desc' },
      skip: 10,
      take: 10,
    });
  });

  it('combines scoped predicates with allowlisted search fields', async () => {
    await service.listPaginated(
      { search: 'name=Maria', sortBy: 'name', order: 'asc' },
      { active: true },
    );

    expect(delegate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            { active: true },
            { OR: [{ name: { contains: 'Maria', mode: 'insensitive' } }] },
          ],
        },
      }),
    );
  });

  it.each([
    [{ sortBy: 'passwordHash' }, 'Unsupported sort field'],
    [{ search: 'passwordHash=secret' }, 'Unsupported search field'],
    [{ search: 'invalid' }, 'Invalid search expression'],
  ])('rejects unsafe query input', async (query, message) => {
    await expect(service.listPaginated(query)).rejects.toThrow(message);
  });
});
