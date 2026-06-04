import { BadRequestException } from "@nestjs/common";

import { PrismaService } from '../../../../../prisma/prisma.service';
import { UserValidations } from "./user-validations.interface";
import { CreateUserCommand } from "../create-user.command";

/*
* @description: Validação para verificar se um endereço foi fornecido para o usuário.
* @param command: O comando de criação de usuário contendo os dados do novo usuário.
* @param dataSource: O serviço Prisma para acessar o banco de dados.
* @throws BadRequestException: Lançada se o endereço não for fornecido para um cliente.
*/
export class UserAddressValidator implements UserValidations {
  async validate(command: CreateUserCommand, dataSource: PrismaService): Promise<void> {
    if (!command.address) {
      throw new BadRequestException("Address is required for client users");
    }

    if (!command.id) {
      throw new BadRequestException("User ID is required to associate the address");
    }

    await dataSource.address.create({
      data: {
        ...command.address,
        user: { connect: { id: BigInt(`${command.id}`) } }
      } as any
    });
  }
}

