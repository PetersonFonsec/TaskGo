import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../prisma/prisma.service';

import { UserValidations } from "../validations/user-validations.interface";
import { CreateUserCommand } from "../create-user.command";
import { CreateUserStrategy } from "./strategy.interface";

import { UserExistValidator } from "../validations/user-exist.validator";
import { UserCreateValidator } from "../validations/user-create.validator";
import { UserAddressValidator } from "../validations/user-address.validator";
import { UserServiceValidator } from "../validations/user-service.validator";

@Injectable()
export class CreateProviderStrategy implements CreateUserStrategy {
  #validations: UserValidations[] = [
    new UserExistValidator(),
    new UserCreateValidator(),
    new UserAddressValidator(),
    new UserServiceValidator(),
  ];

  constructor(private prisma: PrismaService) { }

  async execute(command: CreateUserCommand): Promise<CreateUserCommand> {
    return await this.prisma.$transaction(async (prisma) => {

      for (const validation of this.#validations) {
        await validation.validate(command, prisma);
      }

      return command;
    });
  }
}
