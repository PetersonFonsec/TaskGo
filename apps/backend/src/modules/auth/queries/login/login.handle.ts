import { IQueryHandler } from "@nestjs/cqrs/dist/interfaces/queries/query-handler.interface";
import { ForbiddenException } from "@nestjs/common";
import { QueryHandler } from "@nestjs/cqrs";
import * as bcrypt from 'bcrypt';
import type { PublicUserProfile } from '@taskgo/shared';

import { PrismaService } from "../../../../prisma/prisma.service";
import { ERROR_MESSAGES } from "../../auth.messages";
import { LoginQuery } from "./login.query";
import { toPublicUserProfile } from "../../../user/mappers/public-user-profile.mapper";

@QueryHandler(LoginQuery)
export class LoginQueryHandler implements IQueryHandler<LoginQuery, PublicUserProfile> {

  constructor(private prisma: PrismaService) { }

  async execute(query: LoginQuery): Promise<PublicUserProfile> {
    const user = await this.prisma.user.findUnique({ where: { email: query.email } });
    if (!user) {
      throw new ForbiddenException(ERROR_MESSAGES.loginError);
    }

    const matchPassword = await bcrypt.compare(query.password, user.passwordHash);
    if (!matchPassword) {
      throw new ForbiddenException(ERROR_MESSAGES.loginError);
    }

    return toPublicUserProfile(user);
  }
}
