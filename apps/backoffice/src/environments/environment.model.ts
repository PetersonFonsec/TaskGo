export interface BackofficeEnvironment {
  readonly production: boolean;
  readonly apiUrl: string;
  readonly adminTokenStorageKey: string;
}
