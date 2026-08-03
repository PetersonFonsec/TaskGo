import { PagarmeWebhookDto } from '../../dto/pagarme-webhook.dto';

export class ProcessPagarmeWebhookCommand {
  constructor(public readonly payload: PagarmeWebhookDto) {}
}
