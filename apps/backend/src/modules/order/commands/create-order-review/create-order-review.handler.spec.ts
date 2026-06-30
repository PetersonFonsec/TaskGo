import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';

import { CreateOrderReviewCommand } from './create-order-review.command';
import { CreateOrderReviewHandler } from './create-order-review.handler';

describe('CreateOrderReviewHandler', () => {
  const orderId = 123n;
  const clientId = 7n;
  const providerId = 17n;
  let prisma: any;
  let handler: CreateOrderReviewHandler;

  beforeEach(() => {
    prisma = {
      order: { findUnique: jest.fn() },
      $transaction: jest.fn(),
    };
    handler = new CreateOrderReviewHandler(prisma);
  });

  it('cria a avaliação e devolve a reputação atualizada', async () => {
    const reviewedAt = new Date('2026-06-25T18:00:00.000Z');
    prisma.order.findUnique.mockResolvedValue({
      clientId,
      status: OrderStatus.CONCLUIDO,
      review: null,
      service: { providerId },
    });
    const transaction = {
      reviewTag: {
        findMany: jest.fn().mockResolvedValue([{ id: 1n }, { id: 2n }]),
      },
      avaliacao: {
        create: jest.fn().mockResolvedValue({
          id: 1n,
          rating: 5,
          comment: 'Excelente atendimento.',
          reviewedAt,
          tags: [
            { tag: { id: 1n, name: 'Pontual', slug: 'pontual' } },
            { tag: { id: 2n, name: 'Preço justo', slug: 'preco-justo' } },
          ],
        }),
        aggregate: jest.fn().mockResolvedValue({ _avg: { rating: 4.92 }, _count: { id: 129 } }),
      },
      provider: {
        update: jest.fn().mockResolvedValue({ ratingAvg: 4.92, ratingCount: 129 }),
      },
      orderTimeline: { create: jest.fn().mockResolvedValue({}) },
    };
    prisma.$transaction.mockImplementation((callback: (client: typeof transaction) => unknown) => callback(transaction));

    await expect(handler.execute(new CreateOrderReviewCommand(orderId, clientId, {
      rating: 5,
      comment: ' Excelente atendimento. ',
      tagIds: ['1', '2'],
    }))).resolves.toEqual({
      id: '1',
      orderId: '123',
      rating: 5,
      comment: 'Excelente atendimento.',
      reviewedAt,
      tags: [
        { id: '1', name: 'Pontual', slug: 'pontual' },
        { id: '2', name: 'Preço justo', slug: 'preco-justo' },
      ],
      provider: { id: '17', ratingAvg: 4.92, ratingCount: 129 },
    });
    expect(transaction.provider.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { ratingAvg: 4.92, ratingCount: 129 },
    }));
    expect(transaction.avaliacao.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        tags: { create: [{ tagId: 1n }, { tagId: 2n }] },
      }),
    }));
  });

  it('rejeita uma avaliação duplicada', async () => {
    prisma.order.findUnique.mockResolvedValue({
      clientId,
      status: OrderStatus.CONCLUIDO,
      review: { id: 1n },
      service: { providerId },
    });

    await expect(handler.execute(new CreateOrderReviewCommand(orderId, clientId, { rating: 5 })))
      .rejects.toBeInstanceOf(ConflictException);
  });

  it('rejeita usuário que não é o cliente do pedido', async () => {
    prisma.order.findUnique.mockResolvedValue({
      clientId,
      status: OrderStatus.CONCLUIDO,
      review: null,
      service: { providerId },
    });

    await expect(handler.execute(new CreateOrderReviewCommand(orderId, 99n, { rating: 5 })))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejeita pedido que ainda não foi concluído', async () => {
    prisma.order.findUnique.mockResolvedValue({
      clientId,
      status: OrderStatus.EM_ANDAMENTO,
      review: null,
      service: { providerId },
    });

    await expect(handler.execute(new CreateOrderReviewCommand(orderId, clientId, { rating: 5 })))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejeita tags inexistentes ou inativas', async () => {
    prisma.order.findUnique.mockResolvedValue({
      clientId,
      status: OrderStatus.CONCLUIDO,
      review: null,
      service: { providerId },
    });
    prisma.$transaction.mockImplementation(async (callback: (client: any) => unknown) => callback({
      reviewTag: { findMany: jest.fn().mockResolvedValue([{ id: 1n }]) },
    }));

    await expect(handler.execute(new CreateOrderReviewCommand(orderId, clientId, {
      rating: 5,
      tagIds: ['1', '999'],
    }))).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejeita tags duplicadas antes de abrir a transação', async () => {
    await expect(handler.execute(new CreateOrderReviewCommand(orderId, clientId, {
      rating: 5,
      tagIds: ['1', '01'],
    }))).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
