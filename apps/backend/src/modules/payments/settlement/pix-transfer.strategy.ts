import { BadRequestException, Injectable } from '@nestjs/common';
import {
  GatewayInput,
  PaymentGateway,
  PixDestination,
} from '../payment-gateway';
import { SettlementStrategy } from './settlement-strategy';

@Injectable()
export class PixTransferStrategy extends SettlementStrategy {
  readonly code = 'PIX_TRANSFER';
  constructor(private readonly gateway: PaymentGateway) {
    super();
  }
  prepare(input: GatewayInput, destination: PixDestination) {
    if (!destination?.key || !destination?.type)
      throw new BadRequestException(
        'Prestador ainda não cadastrou a chave PIX',
      );
    if (
      !Number.isSafeInteger(input.providerAmountCents) ||
      input.providerAmountCents < 100
    )
      throw new BadRequestException(
        'Repasse ao prestador deve ser de pelo menos R$ 1,00',
      );
    if (
      input.platformAmountCents + input.providerAmountCents !==
      input.amountCents
    )
      throw new BadRequestException('Divisão financeira inválida');
    return input;
  }
  release(input: {
    externalId: string;
    amount: number;
    destination: PixDestination;
  }) {
    return this.gateway.sendTransfer(input);
  }
  reconcile(externalId: string) {
    return this.gateway.findTransfer(externalId);
  }
}
