import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Address } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import {
  PaginationQuery,
  PaginationResponse,
} from '../../shared/services/pagination/pagination.interface';
import { PaginationService } from '../../shared/services/pagination/pagination.service';
import { Address as AddressEntity } from './entities/address.entity';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

type AddressWriteData = {
  label?: string;
  street?: string;
  number?: string;
  city?: string;
  state?: string;
  cep?: string;
  lat?: number;
  lng?: number;
  complement?: string;
  isDefault?: boolean;
};

@Injectable()
export class AddressService extends PaginationService<Address> {
  constructor(public prisma: PrismaService) {
    super(prisma);
    this.modelName = this.prisma.address;
  }

  async create(userId: bigint, payload: CreateAddressDto) {
    const data = this.sanitizeWrite(payload);
    const address = new AddressEntity({ ...data, userId });

    return this.prisma.$transaction(async (prisma) => {
      if (address.getValue().isDefault) {
        await prisma.address.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }

      return prisma.address.create({
        data: { ...address.getValue(), userId },
      });
    });
  }

  async findAll(
    userId: bigint,
    query: PaginationQuery,
  ): Promise<PaginationResponse<Address>> {
    const defaults: Required<PaginationQuery> = {
      page: 1,
      limit: 10,
      sortBy: 'id',
      order: 'asc',
      search: '',
    };

    return this.listPaginated({ ...defaults, ...query }, { userId });
  }

  async findOne(userId: bigint, id: bigint) {
    await this.assertOwnership(userId, id);
    return this.prisma.address.findFirst({
      where: { id, userId },
    });
  }

  async update(userId: bigint, id: bigint, updateAddressDto: UpdateAddressDto) {
    const data = this.sanitizeWrite(updateAddressDto);

    return this.prisma.$transaction(async (prisma) => {
      await this.assertOwnership(userId, id, prisma);

      if (data.isDefault === true) {
        await prisma.address.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }

      return prisma.address.update({
        where: { id, userId },
        data,
      });
    });
  }

  async remove(userId: bigint, id: bigint) {
    return this.prisma.$transaction(async (prisma) => {
      await this.assertOwnership(userId, id, prisma);
      return prisma.address.delete({ where: { id, userId } });
    });
  }

  private async assertOwnership(
    userId: bigint,
    id: bigint,
    prisma: Pick<PrismaService, 'address'> = this.prisma,
  ) {
    const target = await prisma.address.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });

    if (!target) {
      throw new NotFoundException(`Address with id ${id} not found`);
    }
    if (target.userId !== userId) {
      throw new ForbiddenException('Address does not belong to current user');
    }
  }

  private sanitizeWrite(payload: Partial<CreateAddressDto>): AddressWriteData {
    const data: AddressWriteData = {};
    const keys: readonly (keyof AddressWriteData)[] = [
      'label',
      'street',
      'number',
      'city',
      'state',
      'cep',
      'lat',
      'lng',
      'complement',
      'isDefault',
    ];

    for (const key of keys) {
      if (payload[key] !== undefined) {
        Object.assign(data, { [key]: payload[key] });
      }
    }
    return data;
  }
}
