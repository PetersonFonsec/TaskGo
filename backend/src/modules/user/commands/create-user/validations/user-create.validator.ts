import { PrismaService } from '../../../../../prisma/prisma.service';
import { UserValidations } from "./user-validations.interface";
import { CreateUserCommand } from "../create-user.command";

/*
* @description: Validação para criar um novo usuário no banco de dados.
* Esta validação é responsável por inserir os dados do novo usuário na tabela de usuários e retornar o ID do usuário criado.
* @param command: O comando de criação de usuário contendo os dados do novo usuário.
* @param dataSource: O serviço Prisma para acessar o banco de dados.
*/
export class UserCreateValidator implements UserValidations {
  async validate(command: CreateUserCommand, dataSource: PrismaService): Promise<void> {
    const newUser = await dataSource.user.create({
      data: {
        name: command.name,
        email: command.email,
        passwordHash: command.password,
        photoUrl: command.photoUrl,
        phone: command.phone,
        cpf: command.cpf,
        type: command.type as any,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    }) as any;

    command.id = newUser.id.toString();
  }
}

