import { MobileEnvironment } from './environment.model';

// Troque pela URL HTTPS da API na VPS antes de gerar o build das lojas.
export const environment: MobileEnvironment = {
  production: true,
  apiUrl: 'http://localhost:3000'
};
