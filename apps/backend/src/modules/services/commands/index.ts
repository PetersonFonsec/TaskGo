import { CreateServiceHandler } from './create-service/create-service.handler';
import { RemoveServiceHandler } from './remove-service/remove-service.handler';
import { UpdateServiceHandler } from './update-service/update-service.handler';

export const ServiceCommandHandlers = [
  CreateServiceHandler,
  UpdateServiceHandler,
  RemoveServiceHandler,
];

export { CreateServiceCommand } from './create-service/create-service.command';
export { RemoveServiceCommand } from './remove-service/remove-service.command';
export { UpdateServiceCommand } from './update-service/update-service.command';
