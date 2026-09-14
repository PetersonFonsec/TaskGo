import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ServiceManagementService } from '../../service-management.service';
import { GetServiceQuery } from './get-service.query';
@QueryHandler(GetServiceQuery)
export class GetServiceHandler implements IQueryHandler<GetServiceQuery> {
  constructor(private readonly services: ServiceManagementService) {}
  execute({ id }: GetServiceQuery) {
    return this.services.findPublic(id);
  }
}
