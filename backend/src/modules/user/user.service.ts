import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { User } from '@shared/entities/user.entity';

import { PrismaService } from 'prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

import { PaginationQuery, PaginationResponse } from '@shared/services/pagination/pagination.interface';
import { PaginationService } from '@shared/services/pagination/pagination.service';
import { UserExistException } from '@shared/exceptions/user-exist.exception';

@Injectable()
export class UserService extends PaginationService<User> {

  constructor(public prisma: PrismaService) {
    super(prisma);
    this.modelName = this.prisma.user;
  }

  async create(payload: CreateUserDto): Promise<User> {
    const user = new User(payload as any);
    user.validate();
    user.password = bcrypt.hashSync(user.password, 8);

    return await this.prisma.$transaction(async (prisma) => {
      const existingUser = await this.findByUserByKeys(user.cpf.getValue(), user.email.getValue());
      if (existingUser) throw new UserExistException();

      return await prisma.user.create({
        data: {
          name: user.name,
          email: user.email.getValue(),
          passwordHash: user.password,
          photoUrl: user.photoUrl,
          phone: user.phone?.getValue(),
          cpf: user.cpf.getValue(),
          type: user.type,
        },
      }) as any as User;
    });
  }

  async findByUserByKeys(cpf: string, email: string) {
    return await this.prisma.user.findFirst({
      where: {
        OR: [
          { cpf },
          { email },
        ],
      },
    });
  }

  async findAll(query: PaginationQuery): Promise<PaginationResponse<User>> {
    const queryDefault: PaginationQuery = { page: 1, limit: 10, sortBy: 'id', order: 'desc', search: '' };
    return await this.listPaginated(Object.assign(queryDefault, query));
  }

  async findOne(id: bigint) {
    return await this.prisma.user.findUnique({
      where: { id },
    });
  }

  async findOneByField(where: any) {
    return await this.prisma.user.findUnique({
      where
    });
  }

  async update(id: bigint, updateUserDto: UpdateUserDto) {
    return await this.prisma.user.update({
      where: { id },
      data: updateUserDto,
    });
  }

  async remove(id: bigint) {
    return await this.prisma.user.delete({
      where: { id },
    });
  }
}
