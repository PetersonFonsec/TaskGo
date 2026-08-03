export class AddFavoriteCommand {
  constructor(
    public readonly clientId: bigint,
    public readonly providerId: bigint,
  ) {}
}
