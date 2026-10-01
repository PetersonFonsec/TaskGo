import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FeatureFlagService } from './feature-flag.service';

describe('FeatureFlagService', () => {
  const flags = {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  const service = new FeatureFlagService({
    featureFlag: flags,
    $transaction: (queries: Promise<unknown>[]) => Promise.all(queries),
  } as unknown as PrismaService);
  beforeEach(() => jest.resetAllMocks());
  it('creates disabled flags by default', async () => {
    await service.create({ name: 'favorites' });
    expect(flags.create).toHaveBeenCalledWith({
      data: { name: 'favorites', description: null, isActive: false },
    });
  });
  it('paginates active and inactive flags with stable ordering', async () => {
    flags.findMany.mockResolvedValue([{ id: 1n, isActive: false }]);
    flags.count.mockResolvedValue(21);
    expect(await service.findAll({ page: 2, limit: 20 })).toEqual({
      data: [{ id: 1n, isActive: false }],
      meta: { total: 21, page: 2, limit: 20, totalPages: 2 },
    });
    expect(flags.findMany).toHaveBeenCalledWith({
      skip: 20,
      take: 20,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
  });
  it('updates only provided fields and preserves large IDs', async () => {
    await service.update('9007199254740993', { isActive: false });
    expect(flags.update).toHaveBeenCalledWith({
      where: { id: 9007199254740993n },
      data: { isActive: false },
    });
    await service.update('1', { description: ' ' });
    expect(flags.update).toHaveBeenLastCalledWith({
      where: { id: 1n },
      data: { description: null },
    });
  });
  it('deletes and reports missing records', async () => {
    await service.remove('1');
    expect(flags.delete).toHaveBeenCalledWith({ where: { id: 1n } });
    flags.delete.mockRejectedValue({ code: 'P2025' });
    await expect(service.remove('1')).rejects.toBeInstanceOf(NotFoundException);
    flags.update.mockRejectedValue({ code: 'P2025' });
    await expect(service.update('1', {})).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.findOne('1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
  it.each(['0', '-1', '1.5', 'abc'])('rejects invalid ID %s', async (id) => {
    await expect(service.remove(id)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(flags.delete).not.toHaveBeenCalled();
  });
});
