import { BackofficeEnvironment } from './environment.model';

export const environment: BackofficeEnvironment = {
  production: true,
  apiUrl: '/admin',
  adminTokenStorageKey: 'proxi.backoffice.adminToken'
};
