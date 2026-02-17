import { IQueryHandler } from "@nestjs/cqrs/dist/interfaces/queries/query-handler.interface";
import { ForbiddenException } from "@nestjs/common";
import { plainToClass } from "class-transformer";
import { QueryHandler } from "@nestjs/cqrs";
import * as bcrypt from 'bcrypt';

import { UserDto } from "../../../../modules/user/queries/get-user/get-user.dto";
import { PrismaService } from "../../../../prisma/prisma.service";
import { ERROR_MESSAGES } from "../../auth.messages";
import { LoginQuery } from "./login.query";

@QueryHandler(LoginQuery)
export class LoginQueryHandler implements IQueryHandler<LoginQuery, UserDto> {

  constructor(private prisma: PrismaService) { }

  async execute(query: LoginQuery): Promise<UserDto> {
    const user = await this.prisma.user.findUnique({ where: { email: query.email } });
    if (!user) {
      throw new ForbiddenException(ERROR_MESSAGES.loginError);
    }

    const matchPassword = await bcrypt.compare(query.password, user.passwordHash);
    if (!matchPassword) {
      throw new ForbiddenException(ERROR_MESSAGES.loginError);
    }

    return plainToClass(UserDto, user);
  }
}
