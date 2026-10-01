import { GatewayInput, PixDestination, Transfer } from '../payment-gateway';

/** Snapshot the strategy on each payment. A future split adapter must also prepare
 * recipients during collection; replacing only the release call is not enough. */
export abstract class SettlementStrategy {
  abstract readonly code: string;
  abstract prepare(
    input: GatewayInput,
    destination: PixDestination,
  ): GatewayInput;
  abstract release(input: {
    externalId: string;
    amount: number;
    destination: PixDestination;
  }): Promise<Transfer>;
  abstract reconcile(externalId: string): Promise<Transfer | null>;
}
