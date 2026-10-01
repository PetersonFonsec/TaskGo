import { UpdateProviderPayoutDto } from '../../dto/update-provider-payout.dto';

export class UpdateProviderPayoutCommand {
  constructor(
    public readonly providerId: bigint,
    public readonly payload: UpdateProviderPayoutDto,
  ) {}
}
