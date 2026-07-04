import { BadRequestException } from '@nestjs/common';

import { PrismaService } from '../../../../../prisma/prisma.service';
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
    dataSource: PrismaService,
  ): Promise<void> {
    if (!command.services || command.services.length === 0) {
      throw new BadRequestException('Provider must have at least one service');
    }

    if (!command.id) {
      throw new BadRequestException(
        'User ID is required to associate the services',
      );
    }

    const services = await dataSource.service.findMany({
      where: {
        id: { in: command.services.map((id) => BigInt(`${id}`)) },
        status: 'ATIVO',
      },
    });

    if (services.length !== command.services.length) {
      throw new Error('One or more services not found or inactive');
    }

    await dataSource.provider.create({
      data: {
        id: BigInt(`${command.id}`),
        bio: command.bio,
        status: 'PENDING',
        verified: false,
        services: {
          connect: command.services.map((id) => ({ id: BigInt(`${id}`) })),
        },
      },
    });
  }
}
