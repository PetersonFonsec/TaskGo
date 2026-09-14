export class RemoveServiceCommand {
  constructor(
    public readonly id: bigint,
    public readonly providerId: bigint,
  ) {}
}
