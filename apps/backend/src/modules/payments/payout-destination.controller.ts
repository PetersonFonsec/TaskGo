import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Put,
} from '@nestjs/common';
import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';
import { PrismaService } from '../../prisma/prisma.service';
import { User } from '../../shared/decorators/user.decorator';
import { PixDestination } from './payment-gateway';

export class PayoutDestinationDto {
  @IsIn(['CPF', 'CNPJ', 'PHONE', 'EMAIL', 'RANDOM'])
  type: PixDestination['type'];
  @IsString() @MinLength(3) @MaxLength(254) key: string;
}
export function normalizePixDestination(
  input: PayoutDestinationDto,
): PixDestination {
  const key = ['CPF', 'CNPJ', 'PHONE'].includes(input.type)
    ? input.key.replace(/[\s().+-]/g, '')
    : input.key.trim();
  const patterns = {
    CPF: /^\d{11}$/,
    CNPJ: /^\d{14}$/,
    PHONE: /^(?:55)?\d{10,11}$/,
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    RANDOM: /^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i,
  };
  if (!patterns[input.type]?.test(key))
    throw new BadRequestException('Chave PIX inválida para o tipo informado');
  return { key, type: input.type };
}
@Controller('payments/payout-destination')
export class PayoutDestinationController {
  constructor(private readonly prisma: PrismaService) {}
  private async provider(userId: string) {
    const provider = await this.prisma.provider.findUnique({
      where: { id: BigInt(userId) },
      select: { id: true },
    });
    if (!provider)
      throw new ForbiddenException('Disponível apenas para prestadores');
    return provider.id;
  }
  @Get()
  async get(@User('id') userId: string) {
    const providerId = await this.provider(userId);
    const profile = await this.prisma.providerPayoutProfile.findUnique({
      where: { providerId },
      select: { pixKey: true, pixKeyType: true },
    });
    return { key: profile?.pixKey ?? '', type: profile?.pixKeyType ?? 'CPF' };
  }
  @Get('settlements')
  async settlements(@User('id') userId: string) {
    const providerId = await this.provider(userId);
    const rows = await this.prisma.paymentSettlement.findMany({
      where: { payment: { order: { service: { providerId } } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        amountCents: true,
        status: true,
        completedAt: true,
        payment: { select: { orderId: true } },
      },
    });
    return rows.map((row) => ({
      orderId: row.payment.orderId.toString(),
      amount: row.amountCents / 100,
      status: row.status,
      completedAt: row.completedAt,
    }));
  }
  @Put()
  async save(@User('id') userId: string, @Body() input: PayoutDestinationDto) {
    const providerId = await this.provider(userId);
    const destination = normalizePixDestination(input);
    await this.prisma.providerPayoutProfile.upsert({
      where: { providerId },
      create: {
        providerId,
        pixKey: destination.key,
        pixKeyType: destination.type,
      },
      update: { pixKey: destination.key, pixKeyType: destination.type },
    });
    // Existing payments retain the destination captured at checkout.
    return destination;
  }
}
