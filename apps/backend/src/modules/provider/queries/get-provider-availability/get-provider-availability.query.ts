import { ProviderAvailabilityQueryDto } from '../../dto/provider-availability.dto';

export class GetProviderAvailabilityQuery {
  constructor(
    public readonly providerId: string,
    public readonly filters: ProviderAvailabilityQueryDto,
  ) {}
}
