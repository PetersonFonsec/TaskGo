import { CreateUserCommand } from '../create-user.command';
import { Prisma } from '@prisma/client';

export interface UserValidations {
  validate(
    command: CreateUserCommand,
    dataSource: Prisma.TransactionClient,
  ): Promise<void>;
}
