export class ListFavoritesQuery {
  constructor(
    public readonly clientId: bigint,
    public readonly paging: { skip?: number; take?: number } = {},
  ) {}
}
