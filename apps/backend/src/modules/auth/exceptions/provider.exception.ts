export class ProviderException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProviderException';
  }
}
