import { GetServiceHandler } from './get-service/get-service.handler';
import { ListServicesHandler } from './list-services/list-services.handler';

export const ServiceQueryHandlers = [ListServicesHandler, GetServiceHandler];

export { GetServiceQuery } from './get-service/get-service.query';
export { ListServicesQuery } from './list-services/list-services.query';
