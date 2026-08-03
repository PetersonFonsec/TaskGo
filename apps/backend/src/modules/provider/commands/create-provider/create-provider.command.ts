import { CreateProviderDto } from '../../dto/create-provider.dto';

export class CreateProviderCommand {
  constructor(public readonly payload: CreateProviderDto) {}
}
