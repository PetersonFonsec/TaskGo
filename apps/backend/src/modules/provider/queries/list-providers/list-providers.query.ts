export class ListProvidersQuery {
  constructor(
    public readonly onlyFavorites: boolean,
    public readonly authenticatedUserId?: string,
  ) {}
}
