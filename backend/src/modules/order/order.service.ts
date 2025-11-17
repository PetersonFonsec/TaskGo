import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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
}
