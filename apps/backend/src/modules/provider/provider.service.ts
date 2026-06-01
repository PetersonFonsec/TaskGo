import { Injectable, UnauthorizedException } from '@nestjs/common';

import { ServicesService } from '../services/services.service';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { CreateProviderDto } from './dto/create-provider.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { UserService } from '../user/user.service';
import { FavoritesService } from './favorites.service';

@Injectable()
export class ProviderService {
  constructor(
    public prisma: PrismaService,
    public userService: UserService,
    public serviceService: ServicesService,
    public favoritesService: FavoritesService,
  ) { }

  async create(payload: any) {
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

  async findAll(options?: { onlyFavorites?: boolean; clientId?: number }) {
    if (options?.onlyFavorites) {
      if (!options.clientId) {
        throw new UnauthorizedException('Authenticated client required for favorites filter');
      }

      const favorites = await this.favoritesService.listFavorites(options.clientId, {
        skip: 0,
        take: 100,
      });

      return favorites.items.map((favorite) => favorite.provider);
    }

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
    return this.prisma.provider.findUnique({
      where: {
        id,
      },
      include: {
        user: true,
        locations: true,
        reviews: true,
        serviceAreas: true,
        services: true
      }
    });
  }

  update(id: number, updateProviderDto: UpdateProviderDto) {
    return `This action updates a #${id} provider`;
  }

  remove(id: number) {
    return `This action removes a #${id} provider`;
  }
}
