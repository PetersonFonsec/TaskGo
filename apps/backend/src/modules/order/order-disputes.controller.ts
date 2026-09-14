import { ADMIN_ACTOR_KEY, AdminRequest } from '../admin/auth/admin-actor';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';
import { PrismaService } from '../../prisma/prisma.service';
import { User } from '../../shared/decorators/user.decorator';
import { ParseBigIntPipe } from '../../shared/pipes/parse-bigint.pipe';
import type { AuthenticatedIdentity } from '../../shared/auth/authenticated-identity';
import { Public } from '../../shared/decorators/public.decorator';
import { AdminAuthGuard } from '../admin/auth/admin-auth.guard';
import { AdminRolesGuard } from '../admin/authorization/admin-roles.guard';
import { AdminPermissions } from '../admin/authorization/admin-roles.decorator';
import { AdminCapability } from '../admin/authorization/admin-permissions';

export class OpenDisputeDto {
  @IsString() @MinLength(3) @MaxLength(120) reason: string;
  @IsString() @MinLength(10) @MaxLength(2000) description: string;
}
export class ResolveDisputeDto {
  @IsIn(['RESOLVED', 'REJECTED']) status: 'RESOLVED' | 'REJECTED';
  @IsString() @MinLength(10) @MaxLength(2000) resolution: string;
}
@Controller('orders')
export class OrderDisputesController {
  constructor(private readonly prisma: PrismaService) {}
  @Post(':id/disputes')
  async open(
    @Param('id', ParseBigIntPipe) id: bigint,
    @Body() body: OpenDisputeDto,
    @User() actor: AuthenticatedIdentity,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM pedidos WHERE id = ${id} FOR UPDATE`;
      const order = await tx.order.findFirst({
        where: {
          id,
          OR: [
            { clientId: BigInt(actor.id) },
            { service: { providerId: BigInt(actor.id) } },
          ],
        },
      });
      if (!order) throw new NotFoundException('Pedido não encontrado');
      if (
        !['EM_ANDAMENTO', 'AGUARDANDO_CONFIRMACAO_CLIENTE'].includes(
          order.status,
        )
      )
        throw new BadRequestException(
          'Problemas podem ser reportados durante ou após o atendimento, antes da confirmação',
        );
      const existing = await tx.orderDispute.findFirst({
        where: { orderId: id, status: { in: ['OPEN', 'UNDER_REVIEW'] } },
      });
      if (existing) return existing;
      return tx.orderDispute.create({
        data: {
          orderId: id,
          openedBy: actor.role,
          openedById: BigInt(actor.id),
          reason: body.reason,
          description: body.description,
          status: 'OPEN',
        },
      });
    });
  }
  @Get(':id/disputes')
  async list(
    @Param('id', ParseBigIntPipe) id: bigint,
    @User() actor: AuthenticatedIdentity,
  ) {
    const order = await this.prisma.order.findFirst({
      where: {
        id,
        OR: [
          { clientId: BigInt(actor.id) },
          { service: { providerId: BigInt(actor.id) } },
        ],
      },
      select: { id: true },
    });
    if (!order) throw new NotFoundException('Pedido não encontrado');
    return this.prisma.orderDispute.findMany({
      where: { orderId: id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }
}
@Public()
@UseGuards(AdminAuthGuard, AdminRolesGuard)
@AdminPermissions(AdminCapability.ManageDisputes)
@Controller('admin/disputes')
export class AdminOrderDisputesController {
  constructor(private readonly prisma: PrismaService) {}
  @Get()
  list() {
    return this.prisma.orderDispute.findMany({
      where: { status: { in: ['OPEN', 'UNDER_REVIEW'] } },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
  }
  @Post(':id/resolve')
  async resolve(
    @Param('id', ParseBigIntPipe) id: bigint,
    @Body() body: ResolveDisputeDto,
    @Req() request: AdminRequest,
  ) {
    const changed = await this.prisma.orderDispute.updateMany({
      where: { id, status: { in: ['OPEN', 'UNDER_REVIEW'] } },
      data: {
        status: body.status,
        resolution: body.resolution,
        resolvedAt: new Date(),
        resolvedById: request[ADMIN_ACTOR_KEY]!.id,
      },
    });
    if (!changed.count)
      throw new BadRequestException('Problema inexistente ou já encerrado');
    return { id, status: body.status };
  }
}
