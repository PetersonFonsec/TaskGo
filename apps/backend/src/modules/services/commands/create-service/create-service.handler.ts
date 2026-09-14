import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ServiceManagementService } from '../../service-management.service';
import { CreateServiceCommand } from './create-service.command';
@CommandHandler(CreateServiceCommand)
export class CreateServiceHandler
  implements ICommandHandler<CreateServiceCommand>
{
  constructor(private readonly services: ServiceManagementService) {}
  execute({ payload, providerId }: CreateServiceCommand) {
    return this.services.create(providerId, payload);
  }
}
