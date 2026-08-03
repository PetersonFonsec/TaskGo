import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { GetServiceQuery } from './get-service.query';

@QueryHandler(GetServiceQuery)
export class GetServiceHandler implements IQueryHandler<GetServiceQuery> {
  async execute({ id }: GetServiceQuery) {
    return `This action returns a #${id} service`;
  }
}
