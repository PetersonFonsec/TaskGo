import { assertSafePassword } from '../../../../shared/security/password-policy';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import * as bcrypt from 'bcrypt';
import { env } from 'process';

import { CreateUserCommand } from './create-user.command';
import { CreateUserFactory } from './factories/create-user.factory';
import { UserCreatedEvent } from '../../events/user-created.event';

@CommandHandler(CreateUserCommand)
export class CreateUserHandler
  implements ICommandHandler<CreateUserCommand, string>
{
  #saltRounds = env.NODE_ENV === 'test' ? '4' : '12';

  constructor(
    private readonly eventBus: EventBus,
    private readonly createUserFactory: CreateUserFactory,
  ) {}

  async execute(command: CreateUserCommand): Promise<string> {
    const user = command;
    assertSafePassword(user.password);
    user.password = await bcrypt.hash(
      user.password,
      parseInt(this.#saltRounds),
    );

    const strategy = this.createUserFactory.getStrategy(user);
    const result = await strategy.execute(command);

    const userCreatedEvent = new UserCreatedEvent();
    userCreatedEvent.user = result;

    this.eventBus.publish(userCreatedEvent);

    return result.id!;
  }
}
