import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { NotFoundException } from "@nestjs/common/exceptions/not-found.exception";
import type { PublicUserProfile } from '@taskgo/shared';

import { PrismaService } from '../../../../prisma/prisma.service';
import { GetUserQuery } from "./get-user.query";
import { toPublicUserProfile } from "../../mappers/public-user-profile.mapper";

@QueryHandler(GetUserQuery)
export class GetUserQueryHandler implements IQueryHandler<GetUserQuery, PublicUserProfile> {

  constructor(private prisma: PrismaService) { }

  async execute(query: GetUserQuery): Promise<PublicUserProfile> {
    const user = await this.prisma.user.findUnique({
      where: { id: query.id },
      include: {
        addresses: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with id ${query.id} not found`);
    }

    return toPublicUserProfile(user);
  }
}
