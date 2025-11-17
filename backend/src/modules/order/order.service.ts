import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Order, OrderStatus } from '@prisma/client';

import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';

import { PaginationQuery, PaginationResponse } from '@shared/services/pagination/pagination.interface';
import { PaginationService } from '@shared/services/pagination/pagination.service';
import { PrismaService } from '@prisma/prisma.service';

@Injectable()
export class OrderService extends PaginationService<Order> {

  constructor(
    public prisma: PrismaService,
  ) {
    super(prisma);
    this.modelName = this.prisma.order;
  }

  async create(createOrderDto: CreateOrderDto): Promise<any> {
    const { clientId, serviceId, scheduledFor, finalPrice, paymentMethod, address } = createOrderDto as any;

    // basic validation and conversions
    if (!clientId || !serviceId) throw new BadRequestException('clientId and serviceId are required');

    const svcId = BigInt(serviceId);
    const cliId = BigInt(clientId);

    const service = await this.prisma.service.findUnique({ where: { id: svcId } });
    if (!service) throw new NotFoundException('Service not found');
    if (service.status !== 'ATIVO') throw new BadRequestException('Service is not available');

    const price = finalPrice ?? service.basePrice;

    // create order with payment and address snapshot in a transaction
    const created = await this.prisma.$transaction(async (prisma) => {
      const order = await prisma.order.create({
        data: {
          clientId: cliId,
          serviceId: svcId,
          status: OrderStatus.PENDENTE,
          finalPrice: price,
          scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
          payment: {
            create: {
              method: (paymentMethod as any) || 'PIX',
              status: 'PENDENTE',
              amount: price,
            },
          },
          addressSnap: address
            ? {
                create: {
                  street: address.street,
                  number: address.number,
                  complement: address.complement,
                  neighborhood: address.neighborhood,
                  city: address.city,
                  state: address.state,
                  cep: address.cep,
                  lat: address.lat,
                  lng: address.lng,
                },
              }
            : undefined,
        },
        include: { payment: true, addressSnap: true },
      });

      return order;
    });

    return created;
  }

  async findAll(query: PaginationQuery): Promise<PaginationResponse<Order>> {
    const queryDefault: PaginationQuery = { page: 1, limit: 10, sortBy: 'id', order: 'desc', search: '' };
    return await this.listPaginated(Object.assign(queryDefault, query));
  }

  async findOne(id: bigint): Promise<any> {
    return await this.prisma.order.findUnique({
      where: { id }
    });
  }

  /**
   * Return a lightweight summary for a given order id.
   * Includes: id, status, finalPrice, client (basic fields) and service (basic fields).
   */
  async getSummary(id: bigint): Promise<any> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        client: true,
        addressSnap: true,
        service: true
      }
    });

    if (!order) throw new NotFoundException('Order not found');

    // shape a concise summary
    return {
      id: order.id,
      status: order.status,
      finalPrice: order.finalPrice,
      client: order.client,
      service: order.service,
    };
  }

  async findByClient(clientId: bigint): Promise<any[]> {
    return await this.prisma.order.findMany({
      where: { clientId },
      orderBy: { requestedAt: 'desc' },
      include: {
        service: {
          include: {
            provider: {
              include: { user: true }
            }
          }
        },
        payment: true,
        addressSnap: true,
        review: true,
      }
    });
  }

  /**
   * Find orders where the service belongs to the given providerId.
   * Returns the same includes as findByClient so the frontend can render provider/user info.
   */
  async findByProvider(providerId: bigint): Promise<any[]> {
    return await this.prisma.order.findMany({
      where: {
        // filter orders by the related service's providerId
        service: {
          is: {
            providerId,
          }
        }
      },
      orderBy: { requestedAt: 'desc' },
      include: {
        client: true,
        service: {
          include: {
            provider: {
              include: { user: true }
            }
          }
        },
        payment: true,
        addressSnap: true,
        review: true,
      }
    });
  }

  async update(id: bigint, updateUserDto: UpdateOrderDto) {
    // normalize possible string ids/dates coming from DTO
    const data: any = { ...updateUserDto };
    if (data.clientId) data.clientId = BigInt(data.clientId);
    if (data.serviceId) data.serviceId = BigInt(data.serviceId);
    if (data.scheduledFor) data.scheduledFor = new Date(data.scheduledFor);

    return await this.prisma.order.update({
      where: { id },
      data,
    });
  }

  /**
   * Schedule an order: set its scheduledFor and change status to CONFIRMADO.
   * body may include scheduledFor as ISO string.
   */
  async schedule(id: bigint, body: { scheduledFor: string }) {
    const scheduledAt = new Date(body.scheduledFor);
    return await this.prisma.order.update({
      where: { id },
      data: {
        scheduledFor: scheduledAt,
        status: OrderStatus.CONFIRMADO,
      }
    });
  }

  async remove(id: bigint) {
    return await this.prisma.order.delete({
      where: { id },
    });
  }

  /**
   * Provider confirms they will attend the order.
   * Only the provider that owns the service can confirm the order.
   */
  async confirmByProvider(id: bigint, providerId: bigint) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { service: true },
    });

    if (!order) throw new NotFoundException('Order not found');

    if (!order.service || order.service.providerId !== providerId) {
      throw new ForbiddenException('Provider not allowed to confirm this order');
    }

    if (order.status !== OrderStatus.PENDENTE) {
      throw new BadRequestException('Only PENDENTE orders can be confirmed');
    }

    return await this.prisma.order.update({
      where: { id },
      data: { status: OrderStatus.CONFIRMADO },
    });
  }

  /**
   * Provider cancels the order. Only the provider that owns the service can cancel.
   */
  async cancelByProvider(id: bigint, providerId: bigint) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { service: true },
    });

    if (!order) throw new NotFoundException('Order not found');

    if (!order.service || order.service.providerId !== providerId) {
      throw new ForbiddenException('Provider not allowed to cancel this order');
    }

    // allow cancel from PENDENTE or CONFIRMADO
    if (order.status !== OrderStatus.PENDENTE && order.status !== OrderStatus.CONFIRMADO) {
      throw new BadRequestException('Only PENDENTE or CONFIRMADO orders can be cancelled by provider');
    }

    return await this.prisma.order.update({
      where: { id },
      data: { status: OrderStatus.CANCELADO },
    });
  }
}
