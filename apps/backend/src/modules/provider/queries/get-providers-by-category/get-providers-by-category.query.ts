import { CoverageQuery } from '../../coverage';
import { ProviderSearchFilters } from '../../provider-search';
export class GetProvidersByCategoryQuery {
  constructor(
    public readonly slug: string,
    public readonly coverage: CoverageQuery = {},
    public readonly filters: ProviderSearchFilters = {},
    public readonly onlyFavorites = false,
    public readonly authenticatedUserId?: string | null,
  ) {}
}
