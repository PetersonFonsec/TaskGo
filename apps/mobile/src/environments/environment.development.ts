import { MobileEnvironment } from './environment.model';

// No emulador Android, a máquina host responde em http://10.0.2.2:3000.
export const environment: MobileEnvironment = {
  production: false,
  apiUrl: 'http://localhost:3000'
};
