import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { ProviderService } from '../../provider.service';
import { GetProviderAvailabilityQuery } from './get-provider-availability.query';

@QueryHandler(GetProviderAvailabilityQuery)
export class GetProviderAvailabilityHandler
  implements IQueryHandler<GetProviderAvailabilityQuery>
{
  constructor(private readonly providerService: ProviderService) {}

  execute({ providerId, filters }: GetProviderAvailabilityQuery) {
    return this.providerService.getAvailability(providerId, filters);
  }
}
