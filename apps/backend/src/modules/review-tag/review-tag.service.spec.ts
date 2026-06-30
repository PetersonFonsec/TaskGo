import { ReviewTagService } from './review-tag.service';

describe('ReviewTagService', () => {
  it('lista apenas tags ativas sem expor campos internos', async () => {
    const prisma = {
      reviewTag: {
        findMany: jest.fn().mockResolvedValue([
          { id: 1n, name: 'Pontual', slug: 'pontual' },
        ]),
      },
    } as any;
    const service = new ReviewTagService(prisma);

    await expect(service.findActive()).resolves.toEqual([
      { id: '1', name: 'Pontual', slug: 'pontual' },
    ]);
    expect(prisma.reviewTag.findMany).toHaveBeenCalledWith({
      where: { isActive: true },
      orderBy: { id: 'asc' },
      select: { id: true, name: true, slug: true },
    });
  });
});
