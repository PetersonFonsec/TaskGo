import { FinishOrderHandler } from './finish-order/finish-order.handler';
import { ConfirmOrderCompletionHandler } from './confirm-order-completion/confirm-order-completion.handler';

export const OrderCommandHandlers = [FinishOrderHandler, ConfirmOrderCompletionHandler];
export { FinishOrderCommand } from './finish-order/finish-order.command';
export { ConfirmOrderCompletionCommand } from './confirm-order-completion/confirm-order-completion.command';
