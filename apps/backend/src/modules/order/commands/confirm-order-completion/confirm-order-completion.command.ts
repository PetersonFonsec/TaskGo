import { ConfirmOrderCompletionDto } from '../../dto/confirm-order-completion.dto';

export class ConfirmOrderCompletionCommand {
  constructor(
    public readonly orderId: bigint,
    public readonly clientId: bigint,
    public readonly payload: ConfirmOrderCompletionDto,
  ) {}
}
