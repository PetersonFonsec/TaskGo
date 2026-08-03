import { CreateProviderCommand } from './create-provider.command';
import { CreateProviderHandler } from './create-provider.handler';

describe('CreateProviderHandler', () => {
  it('creates the user and provider in the same transaction', async () => {
    const tx = { provider: { create: jest.fn() } };
    const prisma: any = { $transaction: jest.fn((callback) => callback(tx)) };
    const userService: any = {
      create: jest.fn().mockResolvedValue({ id: 42n }),
    };
    const handler = new CreateProviderHandler(prisma, userService);
    const payload = {
      provider: { name: 'Provider' },
      services: [101n],
    } as never;

    await handler.execute(new CreateProviderCommand(payload));

    expect(userService.create).toHaveBeenCalledWith(payload.provider, tx);
    expect(tx.provider.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: 42n,
        status: 'PENDING',
        verified: false,
        services: { connect: [{ id: 101n }] },
      }),
    });
  });

  it('propagates provider persistence failures', async () => {
    const tx = {
      provider: { create: jest.fn().mockRejectedValue(new Error('failed')) },
    };
    const prisma: any = { $transaction: jest.fn((callback) => callback(tx)) };
    const userService: any = {
      create: jest.fn().mockResolvedValue({ id: 42n }),
    };
    const handler = new CreateProviderHandler(prisma, userService);

    await expect(
      handler.execute(
        new CreateProviderCommand({
          provider: { name: 'Provider' },
          services: [101n],
        } as never),
      ),
    ).rejects.toThrow('failed');
  });
});
