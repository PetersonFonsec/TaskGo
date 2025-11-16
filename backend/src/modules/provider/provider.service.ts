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

  async findAll() {
    return this.prisma.provider.findMany({
      include: {
        user: true,
        services: true,
      }
    });
  }


  /**
   * Find providers that offer at least one service belonging to the given category slug.
   * Assumption: Service.category stores the category/subcategory slug (string).
   *
   * Example usage: findProvidersByCategorySlug('hidraulica')
   */
  async findProvidersByCategorySlug(slug: string) {
    if (!slug) return [];

    return this.prisma.provider.findMany({
      where: {
        services: {
          some: {
            category: slug,
            status: 'ATIVO'
          }
        }
      },
      include: {
        user: true,
        // include only the matching services to keep payload small
        services: {
          where: { category: slug, status: 'ATIVO' }
        }
      }
    });
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
