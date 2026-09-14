import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ServiceManagementService } from '../../service-management.service';
import { RemoveServiceCommand } from './remove-service.command';
@CommandHandler(RemoveServiceCommand)
export class RemoveServiceHandler
  implements ICommandHandler<RemoveServiceCommand>
{
  constructor(private readonly services: ServiceManagementService) {}
  execute({ id, providerId }: RemoveServiceCommand) {
    return this.services.remove(id, providerId);
  }
}
