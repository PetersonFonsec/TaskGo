import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ServiceManagementService } from '../../service-management.service';
import { UpdateServiceCommand } from './update-service.command';
@CommandHandler(UpdateServiceCommand)
export class UpdateServiceHandler
  implements ICommandHandler<UpdateServiceCommand>
{
  constructor(private readonly services: ServiceManagementService) {}
  execute({ id, payload, providerId }: UpdateServiceCommand) {
    return this.services.update(id, providerId, payload);
  }
}
