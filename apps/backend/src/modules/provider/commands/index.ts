import { CreateProviderHandler } from './create-provider/create-provider.handler';
import { RemoveProviderHandler } from './remove-provider/remove-provider.handler';
import { UpdateProviderHandler } from './update-provider/update-provider.handler';

export const ProviderCommandHandlers = [
  CreateProviderHandler,
  UpdateProviderHandler,
  RemoveProviderHandler,
];

export { CreateProviderCommand } from './create-provider/create-provider.command';
export { RemoveProviderCommand } from './remove-provider/remove-provider.command';
export { UpdateProviderCommand } from './update-provider/update-provider.command';
