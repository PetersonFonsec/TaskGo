import { UpdateProviderDto } from '../../dto/update-provider.dto';

export class UpdateProviderCommand {
  constructor(
    public readonly id: bigint,
    public readonly payload: UpdateProviderDto,
  ) {}
}
