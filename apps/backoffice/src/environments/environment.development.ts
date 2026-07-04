import { BackofficeEnvironment } from './environment.model';

export const environment: BackofficeEnvironment = {
  production: false,
  apiUrl: 'http://localhost:3000/admin',
  adminTokenStorageKey: 'proxi.backoffice.dev.adminToken'
};
