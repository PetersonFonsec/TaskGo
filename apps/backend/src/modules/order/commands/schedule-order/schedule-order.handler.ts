import { ForbiddenException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ScheduleOrderCommand } from './schedule-order.command';

@CommandHandler(ScheduleOrderCommand)
export class ScheduleOrderHandler
  implements ICommandHandler<ScheduleOrderCommand>
{
  async execute(_command: ScheduleOrderCommand): Promise<never> {
    throw new ForbiddenException(
      'Use a supported explicit order lifecycle action',
    );
  }
}
