import { CoverageQuery } from '../../coverage';
export class ListProvidersQuery {
  constructor(
    public readonly onlyFavorites: boolean,
    public readonly authenticatedUserId?: string,
    public readonly coverage: CoverageQuery = {},
  ) {}
}
