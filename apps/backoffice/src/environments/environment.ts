import { BackofficeEnvironment } from './environment.model';

export const environment: BackofficeEnvironment = {
  production: true,
  apiUrl: 'https://taskgo-production.up.railway.app/admin',
  adminTokenStorageKey: 'proxi.backoffice.adminToken'
};
