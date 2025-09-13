import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from '@shared/entities/user.entity';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) { }

  async create(payload: CreateUserDto) {
    const user = new User(payload as any);
    user.validate();

    return await this.prisma.user.create({
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
