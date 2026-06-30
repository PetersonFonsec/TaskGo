import { FinishOrderHandler } from './finish-order/finish-order.handler';
import { ConfirmOrderCompletionHandler } from './confirm-order-completion/confirm-order-completion.handler';
import { CreateOrderReviewHandler } from './create-order-review/create-order-review.handler';

export const OrderCommandHandlers = [FinishOrderHandler, ConfirmOrderCompletionHandler, CreateOrderReviewHandler];
export { FinishOrderCommand } from './finish-order/finish-order.command';
export { ConfirmOrderCompletionCommand } from './confirm-order-completion/confirm-order-completion.command';
export { CreateOrderReviewCommand } from './create-order-review/create-order-review.command';
