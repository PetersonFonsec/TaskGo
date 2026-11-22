import { CoverageQuery } from '../../coverage';
import { ProviderSearchFilters } from '../../provider-search';
export class ListProvidersQuery {
  constructor(
    public readonly onlyFavorites: boolean,
    public readonly authenticatedUserId?: string,
    public readonly coverage: CoverageQuery = {},
    public readonly filters: ProviderSearchFilters = {},
  ) {}
}
