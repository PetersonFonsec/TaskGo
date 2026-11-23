import { BackofficeEnvironment } from './environment.model';

export const environment: BackofficeEnvironment = {
  production: true,
  apiUrl: 'https://taskgo-staging.up.railway.app/admin',
  adminTokenStorageKey: 'proxi.backoffice.adminToken'
};
