import {
  normalizePixDestination,
  PayoutDestinationController,
} from './payout-destination.controller';

describe('Provider PIX destination', () => {
  it('normalizes numeric keys and validates type-specific syntax', () => {
    expect(
      normalizePixDestination({ type: 'CPF', key: '529.982.247-25' }),
    ).toEqual({ type: 'CPF', key: '52998224725' });
    expect(() =>
      normalizePixDestination({ type: 'CPF', key: 'another@example.test' }),
    ).toThrow('Chave PIX inválida');
    expect(() =>
      normalizePixDestination({ type: 'RANDOM', key: 'invalid' }),
    ).toThrow('Chave PIX inválida');
  });
  it('derives the destination owner only from authenticated identity', async () => {
    const db: any = {
      provider: { findUnique: jest.fn().mockResolvedValue({ id: 42n }) },
      providerPayoutProfile: { upsert: jest.fn() },
    };
    await new PayoutDestinationController(db).save('42', {
      type: 'EMAIL',
      key: 'own@example.test',
    });
    expect(db.provider.findUnique).toHaveBeenCalledWith({
      where: { id: 42n },
      select: { id: true },
    });
    expect(db.providerPayoutProfile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { providerId: 42n } }),
    );
  });
  it('rejects customers without a provider record', async () => {
    const db: any = {
      provider: { findUnique: jest.fn().mockResolvedValue(null) },
      providerPayoutProfile: { upsert: jest.fn() },
    };
    await expect(
      new PayoutDestinationController(db).save('42', {
        type: 'EMAIL',
        key: 'own@example.test',
      }),
    ).rejects.toThrow('apenas para prestadores');
    expect(db.providerPayoutProfile.upsert).not.toHaveBeenCalled();
  });
});
