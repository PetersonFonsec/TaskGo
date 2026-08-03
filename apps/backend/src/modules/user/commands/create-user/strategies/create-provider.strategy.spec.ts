import { CreateProviderStrategy } from './create-provider.strategy';
import { UserType } from '../../../../../shared/enums/user-type.enum';

describe('CreateProviderStrategy transaction boundary', () => {
  const command = {
    name: 'Provider',
    email: 'provider@taskgo.test',
    password: 'hashed-password',
    phone: '11999999999',
    cpf: '52998224725',
    type: UserType.PROVIDER,
    address: {
      label: 'Home',
      street: 'Main Street',
      number: '10',
      city: 'Sao Paulo',
      state: 'SP',
      cep: '01001000',
      lat: -23.5,
      lng: -46.6,
      isDefault: true,
    },
    services: [101n],
  };

  it('uses only the transaction client for every onboarding write', async () => {
    const transaction = transactionClient();
    const prisma = {
      user: { create: jest.fn() },
      address: { create: jest.fn() },
      provider: { create: jest.fn() },
      $transaction: jest.fn(async (callback) => callback(transaction)),
    };
    const strategy = new CreateProviderStrategy(prisma as never);

    await strategy.execute({ ...command });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(transaction.user.create).toHaveBeenCalledTimes(1);
    expect(transaction.address.create).toHaveBeenCalledTimes(1);
    expect(transaction.provider.create).toHaveBeenCalledTimes(1);
    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(prisma.address.create).not.toHaveBeenCalled();
    expect(prisma.provider.create).not.toHaveBeenCalled();
  });

  it('propagates a late provider failure so Prisma can roll back earlier writes', async () => {
    const transaction = transactionClient();
    transaction.provider.create.mockRejectedValue(
      new Error('provider association failed'),
    );
    const prisma = {
      $transaction: jest.fn(async (callback) => callback(transaction)),
    };
    const strategy = new CreateProviderStrategy(prisma as never);

    await expect(strategy.execute({ ...command })).rejects.toThrow(
      'provider association failed',
    );
    expect(transaction.user.create).toHaveBeenCalledTimes(1);
    expect(transaction.address.create).toHaveBeenCalledTimes(1);
  });
});

function transactionClient() {
  return {
    user: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 42n }),
    },
    address: { create: jest.fn().mockResolvedValue({ id: 7n }) },
    service: { findMany: jest.fn().mockResolvedValue([{ id: 101n }]) },
    provider: { create: jest.fn().mockResolvedValue({ id: 42n }) },
  };
}
