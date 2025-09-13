import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { User } from '@shared/entities/user.entity';

import { PrismaService } from 'prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserExistException } from '@shared/exceptions/user-exist.exception';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) { }

  async create(payload: CreateUserDto): Promise<any> {
    const user = new User(payload as any);
    user.validate();
    user.password = bcrypt.hashSync(user.password, 8);

    await this.prisma.$transaction(async (prisma) => {
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
      });
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

  async findAll() {
    return await this.prisma.user.findMany();
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
