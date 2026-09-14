import { BadRequestException } from '@nestjs/common';

import { Prisma } from '@prisma/client';
import { UserValidations } from './user-validations.interface';
import { CreateUserCommand } from '../create-user.command';

/*
 * @description: Validação para verificar se o usuário do tipo provider possui pelo menos um serviço associado.
 * @param command: O comando de criação de usuário contendo os dados do novo usuário.
 * @param dataSource: O serviço Prisma para acessar o banco de dados.
 * @throws BadRequestException: Lançada se o usuário do tipo provider não tiver pelo menos um serviço associado.
 */
export class UserServiceValidator implements UserValidations {
  async validate(
    command: CreateUserCommand,
    dataSource: Prisma.TransactionClient,
  ): Promise<void> {
    if (!command.subcategoryIds || command.subcategoryIds.length === 0) {
      throw new BadRequestException('Selecione pelo menos uma especialidade');
    }

    if (!command.id) {
      throw new BadRequestException(
        'User ID is required to associate the services',
      );
    }

    const services = await dataSource.subcategory.findMany({
      where: {
        id: { in: command.subcategoryIds.map((id) => BigInt(`${id}`)) },
        isActive: true,
        category: { isActive: true },
      },
      include: { category: { select: { slug: true } } },
    });

    if (services.length !== command.subcategoryIds.length) {
      throw new BadRequestException('Especialidade inexistente ou inativa');
    }

    const social = command.social;

    await dataSource.provider.create({
      data: {
        id: BigInt(`${command.id}`),
        bio: command.bio,
        status: 'PENDING',
        verified: false,
        whatsapp: social?.whatsapp,
        instagram: social?.instagram,
        facebook: social?.facebook,
        linkedin: social?.linkedin ?? social?.linkdin,
        locations: {
          create: { lat: command.address.lat, lng: command.address.lng },
        },
        serviceAreas: {
          create: {
            mode: 'RADIUS',
            centerLat: command.address.lat,
            centerLng: command.address.lng,
            radiusKm: 10,
          },
        },
        services: {
          create: services.map((subcategory) => ({
            title: subcategory.name,
            category: subcategory.category.slug,
            basePrice: 0,
            status: 'INATIVO',
          })),
        },
      },
    });
  }
}
