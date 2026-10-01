import { Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ProviderPayoutProfile } from '@prisma/client';
import type { ProviderPayoutStatusResponse } from '@taskgo/shared';

import { PrismaService } from '../../../../prisma/prisma.service';
import { PagarmeGatewayException, PagarmeService } from '../../pagarme.service';
import {
  isPayoutReady,
  PAYOUT_REFRESH_INTERVAL_MS,
  PAYOUT_SYNCING_CODE,
  recipientProfileState,
  toProviderPayoutResponse,
} from '../../provider-payout-sync';
import { GetProviderPayoutQuery } from './get-provider-payout.query';

@QueryHandler(GetProviderPayoutQuery)
export class GetProviderPayoutHandler
  implements IQueryHandler<GetProviderPayoutQuery>
{
  private readonly logger = new Logger(GetProviderPayoutHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pagarme: PagarmeService,
  ) {}

  async execute({
    providerId,
  }: GetProviderPayoutQuery): Promise<ProviderPayoutStatusResponse> {
    const profile = await this.prisma.providerPayoutProfile.findUnique({
      where: { providerId },
    });
    if (!profile || !this.shouldRefresh(profile))
      return toProviderPayoutResponse(profile);
    return toProviderPayoutResponse(await this.refresh(profile));
  }

  /** Recipient analysis finishes asynchronously at the gateway. */
  private shouldRefresh(profile: ProviderPayoutProfile) {
    return (
      !!profile.pagarmeRecipientId &&
      !isPayoutReady(profile) &&
      profile.lastErrorCode !== PAYOUT_SYNCING_CODE &&
      (!profile.lastSynchronizedAt ||
        profile.lastSynchronizedAt.getTime() <
          Date.now() - PAYOUT_REFRESH_INTERVAL_MS)
    );
  }

  private async refresh(profile: ProviderPayoutProfile) {
    try {
      const result = await this.pagarme.getRecipient(
        profile.pagarmeRecipientId!,
      );
      const state = recipientProfileState(result);
      return await this.prisma.providerPayoutProfile.update({
        where: { providerId: profile.providerId },
        data: {
          syncStatus: state.syncStatus,
          bankAccountStatus: state.bankAccountStatus,
          // Keep the outcome of the provider's last update attempt visible.
          lastErrorCode:
            state.lastErrorCode ??
            (profile.lastErrorCode === 'REJECTED'
              ? null
              : profile.lastErrorCode),
          lastSynchronizedAt: new Date(),
        },
      });
    } catch (error) {
      const category =
        error instanceof PagarmeGatewayException ? error.category : 'UNKNOWN';
      this.logger.warn(
        `Payout recipient refresh failed for provider ${profile.providerId}: ${category}`,
      );
      return profile;
    }
  }
}
