import { BadRequestException } from "@nestjs/common";

import { PrismaService } from '../../../../../prisma/prisma.service';
import { UserValidations } from "./user-validations.interface";
import { CreateUserCommand } from "../create-user.command";

/*
* @description: Validação para verificar se um usuário com o mesmo CPF ou email já existe no banco de dados.
* @param command: O comando de criação de usuário contendo os dados do novo usuário.
* @param dataSource: O serviço Prisma para acessar o banco de dados.
* @throws BadRequestException: Lançada se um usuário com o mesmo CPF ou email já existir.
*/
export class UserExistValidator implements UserValidations {
  async validate(command: CreateUserCommand, dataSource: PrismaService): Promise<void> {
    const existingUser = await dataSource.user.findFirst({
      where: {
        OR: [
          { cpf: command.cpf },
          { email: command.email },
        ],
      },
    });

    if (existingUser) throw new BadRequestException("User with this CPF or email already exists");
  }
}

