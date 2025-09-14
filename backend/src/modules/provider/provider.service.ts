import { PrismaService } from '@prisma/prisma.service';
import { Injectable } from '@nestjs/common';

import { ServicesService } from '../services/services.service';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { UserService } from '../user/user.service';

@Injectable()
export class ProviderService {
  constructor(
    public prisma: PrismaService,
    public userService: UserService,
    public serviceService: ServicesService,
  ) { }

  async create(payload: CreateProviderDto) {
    return await this.prisma.$transaction(async (prisma) => {
      const user = await this.userService.create(payload.provider);
      await prisma.provider.create({
        data: {
          id: user.id,
          bio: payload.provider?.bio,
          services: {
            connect: payload.services.map((id) => ({ id })),
          },
        },
      });

      return user;
    });
  }

  findAll() {
    return `This action returns all provider`;
  }

  findOne(id: number) {
    return `This action returns a #${id} provider`;
  }

  update(id: number, updateProviderDto: UpdateProviderDto) {
    return `This action updates a #${id} provider`;
  }

  remove(id: number) {
    return `This action removes a #${id} provider`;
  }
}
