import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { CancelOrderByProviderDto } from './cancel-order-by-provider.dto';

const errorsFor = async (payload: object) => {
  const dto = plainToInstance(CancelOrderByProviderDto, payload);
  return { dto, errors: await validate(dto) };
};

describe('CancelOrderByProviderDto', () => {
  it.each(['NO_AVAILABILITY', 'OUT_OF_AREA', 'SERVICE_NOT_OFFERED', 'OTHER'])(
    'accepts the %s reason',
    async (reason) => {
      expect((await errorsFor({ reason })).errors).toHaveLength(0);
    },
  );

  it('requires a known reason', async () => {
    expect((await errorsFor({})).errors[0].property).toBe('reason');
    expect((await errorsFor({ reason: 'CANSADO' })).errors).toHaveLength(1);
  });

  it('accepts an optional note up to 500 characters', async () => {
    expect(
      (await errorsFor({ reason: 'OTHER', note: 'x'.repeat(500) })).errors,
    ).toHaveLength(0);
    const { errors } = await errorsFor({
      reason: 'OTHER',
      note: 'x'.repeat(501),
    });
    expect(errors[0].property).toBe('note');
  });

  it('drops blank notes', async () => {
    const { dto, errors } = await errorsFor({ reason: 'OTHER', note: '   ' });
    expect(errors).toHaveLength(0);
    expect(dto.note).toBeUndefined();
  });
});
