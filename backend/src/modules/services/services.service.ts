import { Injectable } from '@nestjs/common';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { PaginationQuery, PaginationResponse } from '@shared/services/pagination/pagination.interface';
import { Service, User } from '@prisma/client';
import { PaginationService } from '@shared/services/pagination/pagination.service';
import { PrismaService } from '@prisma/prisma.service';
import { UserService } from '../user/user.service';
import { UserExistException } from '@shared/exceptions/user-exist.exception';

@Injectable()
export class ServicesService extends PaginationService<Service> {

  constructor(
    public prisma: PrismaService,
    public userService: UserService,
  ) {
    super(prisma);
    this.modelName = this.prisma.service;
  }

  create(createServiceDto: CreateServiceDto) {
    return 'This action adds a new service';
  }

  async associateServicesWithProvider(providerId: bigint, serviceIds: bigint[]) {
    return await this.prisma.provider.update({
      where: { id: providerId },
      data: {
        services: {
          connect: serviceIds.map((id) => ({ id })),
        },
      },
    });
  }

  async findAll(query: PaginationQuery): Promise<PaginationResponse<Service>> {
    const queryDefault: PaginationQuery = { page: 1, limit: 10, sortBy: 'id', order: 'desc', search: '' };
    return await this.listPaginated(Object.assign(queryDefault, query));
  }

  findOne(id: number) {
    return `This action returns a #${id} service`;
  }

  update(id: number, updateServiceDto: UpdateServiceDto) {
    return `This action updates a #${id} service`;
  }

  remove(id: number) {
    return `This action removes a #${id} service`;
  }
}
