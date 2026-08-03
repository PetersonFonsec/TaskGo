import { GetProviderAvailabilityHandler } from './get-provider-availability/get-provider-availability.handler';
import { GetProviderHandler } from './get-provider/get-provider.handler';
import { GetProvidersByCategoryHandler } from './get-providers-by-category/get-providers-by-category.handler';
import { ListProvidersHandler } from './list-providers/list-providers.handler';

export const ProviderQueryHandlers = [
  ListProvidersHandler,
  GetProviderHandler,
  GetProviderAvailabilityHandler,
  GetProvidersByCategoryHandler,
];

export { GetProviderAvailabilityQuery } from './get-provider-availability/get-provider-availability.query';
export { GetProviderQuery } from './get-provider/get-provider.query';
export { GetProvidersByCategoryQuery } from './get-providers-by-category/get-providers-by-category.query';
export { ListProvidersQuery } from './list-providers/list-providers.query';
