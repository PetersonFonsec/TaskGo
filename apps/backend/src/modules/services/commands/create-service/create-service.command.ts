import { CreateServiceDto } from '../../dto/create-service.dto';

export class CreateServiceCommand {
  constructor(public readonly payload: CreateServiceDto) {}
}
