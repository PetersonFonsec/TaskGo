import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { NotFoundException } from "@nestjs/common/exceptions/not-found.exception";
import { plainToClass } from "class-transformer";

import { PrismaService } from '../../../../prisma/prisma.service';
import { GetUserQuery } from "./get-user.query";
import { UserDto } from "./get-user.dto";

@QueryHandler(GetUserQuery)
export class GetUserQueryHandler implements IQueryHandler<GetUserQuery, UserDto> {

  constructor(private prisma: PrismaService) { }

  async execute(query: GetUserQuery): Promise<UserDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: query.id },
      include: {
        addresses: true,
        orders: true,
        reviews: true,
        provider: true
      },
    });

    if (!user) {
      throw new NotFoundException(`User with id ${query.id} not found`);
    }

    return plainToClass(UserDto, user);
  }
}
