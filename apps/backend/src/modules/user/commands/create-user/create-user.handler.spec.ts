import { EventBus } from '@nestjs/cqrs';

import { CreateUserHandler } from './create-user.handler';
import { CreateUserFactory } from './factories/create-user.factory';
import { UserCreatedEvent } from '../../events/user-created.event';
import { UserType } from '../../../../shared/enums/user-type.enum';

describe('CreateUserHandler commit boundary', () => {
  const command = {
    name: 'Provider',
    email: 'provider@taskgo.test',
    password: 'plain-password',
    phone: '11999999999',
    cpf: '52998224725',
    type: UserType.PROVIDER,
  } as never;

  it('publishes UserCreatedEvent only after the strategy succeeds', async () => {
    const publish = jest.fn();
    const execute = jest.fn().mockResolvedValue({ id: '42' });
    const handler = new CreateUserHandler(
      { publish } as unknown as EventBus,
      { getStrategy: () => ({ execute }) } as unknown as CreateUserFactory,
    );

    await expect(handler.execute({ ...command })).resolves.toBe('42');
    expect(publish).toHaveBeenCalledWith(expect.any(UserCreatedEvent));
    expect(execute.mock.invocationCallOrder[0]).toBeLessThan(
      publish.mock.invocationCallOrder[0],
    );
  });

  it('does not publish an event when the transaction strategy fails', async () => {
    const publish = jest.fn();
    const execute = jest.fn().mockRejectedValue(new Error('rollback'));
    const handler = new CreateUserHandler(
      { publish } as unknown as EventBus,
      { getStrategy: () => ({ execute }) } as unknown as CreateUserFactory,
    );

    await expect(handler.execute({ ...command })).rejects.toThrow('rollback');
    expect(publish).not.toHaveBeenCalled();
  });
});
