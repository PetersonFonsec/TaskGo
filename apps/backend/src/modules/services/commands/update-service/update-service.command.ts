import { UpdateServiceDto } from '../../dto/update-service.dto';

export class UpdateServiceCommand {
  constructor(
    public readonly id: bigint,
    public readonly payload: UpdateServiceDto,
  ) {}
}
