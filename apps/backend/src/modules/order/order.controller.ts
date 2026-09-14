import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';

import { PaginationQuery } from '../../shared/services/pagination/pagination.interface';

import { ScheduleOrderDto } from './dto/schedule-order.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  GetOrderDetailsQuery,
  GetOrderSummaryQuery,
  ListClientOrdersQuery,
  ListProviderOrdersQuery,
} from './queries';
import {
  CancelOrderByProviderCommand,
  ConfirmOrderByProviderCommand,
  ConfirmOrderCompletionCommand,
  CreateOrderCommand,
  CreateOrderReviewCommand,
  FinishOrderCommand,
} from './commands';
import { FinishOrderDto } from './dto/finish-order.dto';
import { User } from '../../shared/decorators/user.decorator';
import { ConfirmOrderCompletionDto } from './dto/confirm-order-completion.dto';
import { CreateOrderReviewDto } from './dto/create-order-review.dto';
import { ParseBigIntPipe } from '../../shared/pipes/parse-bigint.pipe';

import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedIdentity } from '../../shared/auth/authenticated-identity';

@Controller(['order', 'orders'])
export class OrderController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  create(
    @Body() createOrderDto: CreateOrderDto,
    @User() user: AuthenticatedIdentity,
  ) {
    this.identity(user, 'CLIENTE');
    createOrderDto.clientId = user.id;
    return this.commandBus.execute(new CreateOrderCommand(createOrderDto));
  }

  @Get()
  findAll(
    @Query() _query: PaginationQuery,
    @User() user: AuthenticatedIdentity,
  ) {
    this.identity(user);
    return this.queryBus.execute(
      user.role === 'CLIENTE'
        ? new ListClientOrdersQuery(BigInt(user.id))
        : new ListProviderOrdersQuery(BigInt(user.id)),
    );
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseBigIntPipe) id: bigint,
    @User() user: AuthenticatedIdentity,
  ) {
    await this.participant(id, user);
    return this.queryBus.execute(new GetOrderDetailsQuery(id));
  }

  @Get(':id/summary')
  async getSummary(
    @Param('id', ParseBigIntPipe) id: bigint,
    @User() user: AuthenticatedIdentity,
  ) {
    await this.participant(id, user);
    return this.queryBus.execute(new GetOrderSummaryQuery(id));
  }

  @Get('client/:clientId')
  findByClient(
    @Param('clientId', ParseBigIntPipe) clientId: bigint,
    @User() user: AuthenticatedIdentity,
  ) {
    this.identity(user, 'CLIENTE');
    if (BigInt(user.id) !== clientId) throw new ForbiddenException();
    return this.queryBus.execute(new ListClientOrdersQuery(clientId));
  }

  @Get('provider/:providerId')
  findByProvider(
    @Param('providerId', ParseBigIntPipe) providerId: bigint,
    @User() user: AuthenticatedIdentity,
  ) {
    this.identity(user, 'PRESTADOR');
    if (BigInt(user.id) !== providerId) throw new ForbiddenException();
    return this.queryBus.execute(new ListProviderOrdersQuery(providerId));
  }

  @Patch(':id')
  update(
    @Param('id', ParseBigIntPipe) _id: bigint,
    @Body() _updateOrderDto: UpdateOrderDto,
  ) {
    throw new ForbiddenException('Use an explicit order lifecycle action');
  }

  @Patch(':id/finish')
  finish(
    @Param('id', ParseBigIntPipe) id: bigint,
    @User() user: AuthenticatedIdentity,
    @Body() payload: FinishOrderDto,
  ) {
    return this.commandBus.execute(
      new FinishOrderCommand(
        id,
        BigInt(this.identity(user, 'PRESTADOR').id),
        payload,
      ),
    );
  }

  @Patch(':id/confirm')
  confirmCompletion(
    @Param('id', ParseBigIntPipe) id: bigint,
    @User() user: AuthenticatedIdentity,
    @Body() payload: ConfirmOrderCompletionDto,
  ) {
    return this.commandBus.execute(
      new ConfirmOrderCompletionCommand(
        id,
        BigInt(this.identity(user, 'CLIENTE').id),
        payload,
      ),
    );
  }

  @Post(':id/review')
  createReview(
    @Param('id', ParseBigIntPipe) id: bigint,
    @User() user: AuthenticatedIdentity,
    @Body() payload: CreateOrderReviewDto,
  ) {
    return this.commandBus.execute(
      new CreateOrderReviewCommand(
        id,
        BigInt(this.identity(user, 'CLIENTE').id),
        payload,
      ),
    );
  }

  @Delete(':id')
  remove(@Param('id', ParseBigIntPipe) _id: bigint) {
    throw new ForbiddenException('Order history cannot be deleted');
  }

  @Post(':id/schedule')
  schedule(
    @Param('id', ParseBigIntPipe) _id: bigint,
    @Body() _body: ScheduleOrderDto,
  ) {
    throw new ForbiddenException('Rescheduling is not available');
  }

  @Post(':id/provider/:providerId/confirm')
  confirmByProvider(
    @Param('id', ParseBigIntPipe) id: bigint,
    @Param('providerId', ParseBigIntPipe) providerId: bigint,
    @User() user: AuthenticatedIdentity,
  ) {
    this.identity(user, 'PRESTADOR');
    if (BigInt(user.id) !== providerId) throw new ForbiddenException();
    return this.commandBus.execute(
      new ConfirmOrderByProviderCommand(id, providerId),
    );
  }

  @Post(':id/provider/:providerId/cancel')
  cancelByProvider(
    @Param('id', ParseBigIntPipe) id: bigint,
    @Param('providerId', ParseBigIntPipe) providerId: bigint,
    @User() user: AuthenticatedIdentity,
  ) {
    this.identity(user, 'PRESTADOR');
    if (BigInt(user.id) !== providerId) throw new ForbiddenException();
    return this.commandBus.execute(
      new CancelOrderByProviderCommand(id, providerId),
    );
  }

  @Patch(':id/on-the-way')
  onTheWay(
    @Param('id', ParseBigIntPipe) id: bigint,
    @User() user: AuthenticatedIdentity,
  ) {
    return this.transition(
      id,
      user,
      'AGENDADO',
      'EM_DESLOCAMENTO',
      'PROVIDER_ON_THE_WAY',
    );
  }

  @Patch(':id/start')
  start(
    @Param('id', ParseBigIntPipe) id: bigint,
    @User() user: AuthenticatedIdentity,
  ) {
    return this.transition(
      id,
      user,
      'EM_DESLOCAMENTO',
      'EM_ANDAMENTO',
      'SERVICE_STARTED',
    );
  }

  private identity(user: AuthenticatedIdentity, role?: string) {
    if (!user?.id) throw new UnauthorizedException();
    if (role && user.role !== role) throw new ForbiddenException();
    return user;
  }

  private async participant(id: bigint, user: AuthenticatedIdentity) {
    this.identity(user);
    const order = await this.prisma.order.findFirst({
      where: {
        id,
        ...(user.role === 'CLIENTE'
          ? { clientId: BigInt(user.id) }
          : { service: { providerId: BigInt(user.id) } }),
      },
      select: { id: true },
    });
    if (!order) throw new ForbiddenException();
  }

  private async transition(
    id: bigint,
    user: AuthenticatedIdentity,
    from: 'AGENDADO' | 'EM_DESLOCAMENTO',
    to: 'EM_DESLOCAMENTO' | 'EM_ANDAMENTO',
    event: 'PROVIDER_ON_THE_WAY' | 'SERVICE_STARTED',
  ) {
    this.identity(user, 'PRESTADOR');
    return this.prisma.$transaction(async (tx) => {
      const result = await tx.order.updateMany({
        where: {
          id,
          status: from,
          service: {
            providerId: BigInt(user.id),
            provider: { status: 'APPROVED' },
          },
          payment: { method: 'PIX', status: { in: ['CAPTURED', 'PAGO'] } },
        },
        data: { status: to },
      });
      if (result.count !== 1)
        throw new ForbiddenException(
          'Order, payment or lifecycle does not permit this action',
        );
      await tx.orderTimeline.create({
        data: {
          orderId: id,
          event,
          createdBy: 'PRESTADOR',
          createdAt: new Date(),
        },
      });
      return { id: id.toString(), status: to };
    });
  }
}
