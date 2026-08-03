import { CancelOrderByProviderHandler } from './cancel-order-by-provider/cancel-order-by-provider.handler';
import { FinishOrderHandler } from './finish-order/finish-order.handler';
import { ConfirmOrderCompletionHandler } from './confirm-order-completion/confirm-order-completion.handler';
import { ConfirmOrderByProviderHandler } from './confirm-order-by-provider/confirm-order-by-provider.handler';
import { CreateOrderHandler } from './create-order/create-order.handler';
import { CreateOrderReviewHandler } from './create-order-review/create-order-review.handler';
import { RemoveOrderHandler } from './remove-order/remove-order.handler';
import { ScheduleOrderHandler } from './schedule-order/schedule-order.handler';
import { UpdateOrderHandler } from './update-order/update-order.handler';

export const OrderCommandHandlers = [
  CreateOrderHandler,
  UpdateOrderHandler,
  ScheduleOrderHandler,
  RemoveOrderHandler,
  ConfirmOrderByProviderHandler,
  CancelOrderByProviderHandler,
  FinishOrderHandler,
  ConfirmOrderCompletionHandler,
  CreateOrderReviewHandler,
];
export { CancelOrderByProviderCommand } from './cancel-order-by-provider/cancel-order-by-provider.command';
export { ConfirmOrderByProviderCommand } from './confirm-order-by-provider/confirm-order-by-provider.command';
export { CreateOrderCommand } from './create-order/create-order.command';
export { FinishOrderCommand } from './finish-order/finish-order.command';
export { ConfirmOrderCompletionCommand } from './confirm-order-completion/confirm-order-completion.command';
export { CreateOrderReviewCommand } from './create-order-review/create-order-review.command';
export { RemoveOrderCommand } from './remove-order/remove-order.command';
export { ScheduleOrderCommand } from './schedule-order/schedule-order.command';
export { UpdateOrderCommand } from './update-order/update-order.command';
