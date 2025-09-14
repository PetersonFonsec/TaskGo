import { Injectable } from '@nestjs/common';
import { PrismaService } from '@prisma/prisma.service';
import { Address } from '@prisma/client';

import { PaginationQuery, PaginationResponse } from '@shared/services/pagination/pagination.interface';
import { PaginationService } from '@shared/services/pagination/pagination.service';
import { Address as AddressEntity } from './entities/address.entity';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class AddressService extends PaginationService<Address> {
  constructor(public prisma: PrismaService) {
    super(prisma);
    this.modelName = this.prisma.address;
  }

  create(payload: CreateAddressDto) {
    const address = new AddressEntity(payload);
    address.validate();

    return this.prisma.address.create({ data: address.getValue() });
  }

  async findAll(query: PaginationQuery): Promise<PaginationResponse<Address>> {
    const queryDefault: PaginationQuery = { page: 1, limit: 10, sortBy: 'id', order: 'desc', search: '' };
    return await this.listPaginated(Object.assign(queryDefault, query));
  }

  findOne(id: number) {
    return this.prisma.address.findUnique({ where: { id } });
  }

  update(id: number, updateAddressDto: UpdateAddressDto) {
    return `This action updates a #${id} address`;
  }

  remove(id: number) {
    return `This action removes a #${id} address`;
  }
}
