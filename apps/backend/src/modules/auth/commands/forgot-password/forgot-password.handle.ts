import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ForgotPasswordCommand } from './forgot-password.command';
import { AccountRecoveryService } from '../../account-recovery.service';
@CommandHandler(ForgotPasswordCommand)
export class ForgotPasswordHandler
  implements ICommandHandler<ForgotPasswordCommand>
{
  constructor(private readonly recovery: AccountRecoveryService) {}
  execute(command: ForgotPasswordCommand) {
    return this.recovery.request(command.email);
  }
}
