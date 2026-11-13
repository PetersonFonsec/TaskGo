export interface MobileEnvironment {
  readonly production: boolean;
  /** Base da API NestJS, sem barra no final. */
  readonly apiUrl: string;
}
