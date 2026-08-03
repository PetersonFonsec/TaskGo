import { GetOrderDetailsHandler } from './get-order-details/get-order-details.handler';
import { GetOrderSummaryHandler } from './get-order-summary/get-order-summary.handler';
import { ListClientOrdersHandler } from './list-client-orders/list-client-orders.handler';
import { ListOrdersHandler } from './list-orders/list-orders.handler';
import { ListProviderOrdersHandler } from './list-provider-orders/list-provider-orders.handler';

export const OrderQueryHandlers = [
  GetOrderDetailsHandler,
  GetOrderSummaryHandler,
  ListOrdersHandler,
  ListClientOrdersHandler,
  ListProviderOrdersHandler,
];

export { GetOrderDetailsQuery } from './get-order-details/get-order-details.query';
export { GetOrderSummaryQuery } from './get-order-summary/get-order-summary.query';
export { ListClientOrdersQuery } from './list-client-orders/list-client-orders.query';
export { ListOrdersQuery } from './list-orders/list-orders.query';
export { ListProviderOrdersQuery } from './list-provider-orders/list-provider-orders.query';
