export class RemoveFavoriteCommand {
  constructor(
    public readonly clientId: bigint,
    public readonly providerId: bigint,
  ) {}
}
