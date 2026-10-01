import { BadRequestException, Injectable } from '@nestjs/common';
import { PixTransferStrategy } from './pix-transfer.strategy';
import { SettlementStrategy } from './settlement-strategy';

@Injectable()
export class SettlementStrategies {
  constructor(private readonly pix: PixTransferStrategy) {}
  /** Change only for new payments after a split adapter has been homologated. */
  active(): SettlementStrategy {
    return this.pix;
  }
  resolve(code: string): SettlementStrategy {
    if (code === this.pix.code) return this.pix;
    throw new BadRequestException('Estratégia de repasse não disponível');
  }
}
