import {
  BadRequestException,
  ConflictException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ProviderBankAccountStatus } from '@prisma/client';
import { createHash } from 'crypto';
import type { ProviderPayoutMutationResponse } from '@taskgo/shared';

import { PrismaService } from '../../../../prisma/prisma.service';
import { Cpf } from '../../../../shared/entities/cpf.entity';
import { UpdateProviderPayoutDto } from '../../dto/update-provider-payout.dto';
import {
  PagarmeGatewayException,
  PagarmeService,
  RecipientBankAccountInput,
  RecipientResult,
} from '../../pagarme.service';
import {
  isValidCnpj,
  lastDigits,
  PAYOUT_SYNC_LOCK_MS,
  PAYOUT_SYNCING_CODE,
  recipientProfileState,
  splitBrazilianPhone,
  toProviderPayoutResponse,
} from '../../provider-payout-sync';
import { UpdateProviderPayoutCommand } from './update-provider-payout.command';

@CommandHandler(UpdateProviderPayoutCommand)
export class UpdateProviderPayoutHandler
  implements ICommandHandler<UpdateProviderPayoutCommand>
{
  private readonly logger = new Logger(UpdateProviderPayoutHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pagarme: PagarmeService,
  ) {}

  async execute({
    providerId,
    payload,
  }: UpdateProviderPayoutCommand): Promise<ProviderPayoutMutationResponse> {
    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
      select: {
        id: true,
        user: { select: { name: true, email: true, cpf: true, phone: true } },
      },
    });
    if (!provider) throw new NotFoundException('Prestador não encontrado');
    this.assertHolderDocument(payload, provider.user.cpf);

    const previous = await this.prisma.providerPayoutProfile.upsert({
      where: { providerId },
      create: { providerId },
      update: {},
    });
    await this.claim(providerId);

    const bankAccount = this.toGatewayBankAccount(payload);
    const idempotencyKey = this.idempotencyKey(providerId, payload);
    let result: RecipientResult;
    try {
      result = previous.pagarmeRecipientId
        ? await this.pagarme.updateRecipientBankAccount(
            previous.pagarmeRecipientId,
            bankAccount,
            idempotencyKey,
          )
        : await this.pagarme.createRecipient({
            idempotencyKey,
            code: `taskgo-provider-${providerId}`,
            name: payload.holderName,
            email: provider.user.email,
            document: payload.holderDocument,
            type: bankAccount.holderType,
            phone: splitBrazilianPhone(provider.user.phone),
            bankAccount,
          });
    } catch (error) {
      const errorCode =
        error instanceof PagarmeGatewayException ? error.category : 'UNKNOWN';
      this.logger.warn(
        `Payout recipient sync failed for provider ${providerId}: ${errorCode}`,
      );
      // The gateway keeps the previous account; only a first setup is marked
      // as failed so an existing READY recipient keeps receiving payments.
      const failed = await this.prisma.providerPayoutProfile.update({
        where: { providerId },
        data: {
          lastErrorCode: errorCode,
          ...(previous.pagarmeRecipientId
            ? {}
            : { bankAccountStatus: ProviderBankAccountStatus.ERROR }),
        },
      });
      return toProviderPayoutResponse(failed);
    }

    const saved = await this.prisma.providerPayoutProfile.update({
      where: { providerId },
      data: {
        pagarmeRecipientId: result.recipientId,
        ...recipientProfileState(result),
        bankName: null,
        bankCode: payload.bankCode,
        branchLastDigits: lastDigits(payload.branchNumber, 2),
        accountLastDigits: lastDigits(payload.accountNumber, 4),
        lastSynchronizedAt: new Date(),
      },
    });
    return toProviderPayoutResponse(saved);
  }

  private assertHolderDocument(
    payload: UpdateProviderPayoutDto,
    providerCpf: string,
  ) {
    if (payload.holderType === 'INDIVIDUAL') {
      if (
        payload.holderDocument.length !== 11 ||
        !Cpf.isValid(payload.holderDocument)
      )
        throw new BadRequestException('CPF do titular inválido');
      if (payload.holderDocument !== providerCpf.replace(/\D/g, ''))
        throw new BadRequestException(
          'A conta de pessoa física deve estar no CPF cadastrado no seu perfil',
        );
      return;
    }
    if (!isValidCnpj(payload.holderDocument))
      throw new BadRequestException('CNPJ do titular inválido');
  }

  /**
   * Recipient idempotency is not documented by the gateway, so TaskGo keeps a
   * short-lived claim to avoid concurrent creations for the same provider.
   */
  private async claim(providerId: bigint) {
    const { count } = await this.prisma.providerPayoutProfile.updateMany({
      where: {
        providerId,
        OR: [
          { lastErrorCode: null },
          { lastErrorCode: { not: PAYOUT_SYNCING_CODE } },
          { updatedAt: { lt: new Date(Date.now() - PAYOUT_SYNC_LOCK_MS) } },
        ],
      },
      data: { lastErrorCode: PAYOUT_SYNCING_CODE },
    });
    if (count === 0)
      throw new ConflictException(
        'Já existe uma atualização da conta de recebimento em andamento',
      );
  }

  private toGatewayBankAccount(
    payload: UpdateProviderPayoutDto,
  ): RecipientBankAccountInput {
    return {
      holderName: payload.holderName,
      holderType: payload.holderType === 'COMPANY' ? 'company' : 'individual',
      holderDocument: payload.holderDocument,
      bank: payload.bankCode,
      branchNumber: payload.branchNumber,
      branchCheckDigit: payload.branchCheckDigit || null,
      accountNumber: payload.accountNumber,
      accountCheckDigit: payload.accountCheckDigit.toLowerCase(),
      type: payload.accountType === 'SAVINGS' ? 'savings' : 'checking',
    };
  }

  /** Same data retried yields the same key; changed data starts a new one. */
  private idempotencyKey(providerId: bigint, payload: UpdateProviderPayoutDto) {
    const digest = createHash('sha256')
      .update(
        JSON.stringify([
          payload.holderName,
          payload.holderType,
          payload.holderDocument,
          payload.bankCode,
          payload.branchNumber,
          payload.branchCheckDigit ?? '',
          payload.accountNumber,
          payload.accountCheckDigit,
          payload.accountType,
        ]),
      )
      .digest('hex')
      .slice(0, 32);
    return `payout-${providerId}-${digest}`;
  }
}
