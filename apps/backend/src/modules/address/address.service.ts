import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Address } from '@prisma/client';

import { PaginationQuery, PaginationResponse } from '../../shared/services/pagination/pagination.interface';
import { PaginationService } from '../../shared/services/pagination/pagination.service';
import { Address as AddressEntity } from './entities/address.entity';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class AddressService extends PaginationService<Address> {
  constructor(public prisma: PrismaService) {
    super(prisma);
    this.modelName = this.prisma.address;
  }

  async create(payload: CreateAddressDto) {
    const address = new AddressEntity(payload);

    if (address.getValue().isDefault && !payload.userId) {
      throw new BadRequestException('userId is required when setting isDefault on an address');
    }

    return this.prisma.$transaction(async (prisma) => {
      if (address.getValue().isDefault && payload.userId) {
        await prisma.address.updateMany({
          where: { userId: payload.userId, isDefault: true },
          data: { isDefault: false },
        });
      }

      return prisma.address.create({ data: address.getValue() });
    });
  }

  async findAll(query: PaginationQuery): Promise<PaginationResponse<Address>> {
    const queryDefault: PaginationQuery = { page: 1, limit: 10, sortBy: 'id', order: 'asc', search: '' };
    return await this.listPaginated(Object.assign(queryDefault, query));
  }

  async findOne(id: bigint) {
    return this.prisma.address.findUnique({ where: { id } });
  }

  async update(id: bigint, updateAddressDto: UpdateAddressDto) {
    return this.prisma.$transaction(async (prisma) => {
      const existing = await prisma.address.findUnique({ where: { id } });
      if (!existing) {
        throw new NotFoundException(`Address with id ${id} not found`);
      }

      const userId = updateAddressDto.userId ?? existing.userId;
      const shouldUpdateDefault = updateAddressDto.isDefault === true;

      if (shouldUpdateDefault && !userId) {
        throw new BadRequestException('userId is required when setting isDefault on an address');
      }

      if (shouldUpdateDefault && userId) {
        await prisma.address.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }

      return prisma.address.update({
        where: { id },
        data: updateAddressDto,
      });
    });
  }

  async remove(id: bigint) {
    return this.prisma.address.delete({ where: { id }});
  }
}
