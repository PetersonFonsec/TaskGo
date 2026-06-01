import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';


import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { RequestEmailVerificationDto } from './dto/request-email-verification.dto';
import { RequestPhoneVerificationDto } from './dto/request-phone-verification.dto';
import { ConfirmEmailVerificationDto } from './dto/confirm-email-verification.dto';
import { ConfirmPhoneVerificationDto } from './dto/confirm-phone-verification.dto';

import { AddressService } from '../address/address.service';
import { Address } from '../address/entities/address.entity';

import { Email } from '../../shared/entities/email.entity';
import { Phone } from '../../shared/entities/phone.entity';
import { User } from '../../shared/entities/user.entity';
import { PaginationQuery, PaginationResponse } from '../../shared/services/pagination/pagination.interface';
import { PaginationService } from '../../shared/services/pagination/pagination.service';
import { UserExistException } from '../../shared/exceptions/user-exist.exception';
import { UserVerificationService } from './user-verification.service';

@Injectable()
export class UserService extends PaginationService<User> {

  constructor(
    public prisma: PrismaService,
    private readonly userVerificationService: UserVerificationService,
  ) {
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

      const newUser = await prisma.user.create({
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

      if (!payload.address) return newUser;

      const address = new Address(payload.address);
      address.validate();

      await prisma.address.create({
        data: {
          ...address.getValue(),
          user: { connect: { id: newUser.id } }
        }
      });
      return newUser;
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
      include: {
        addresses: true,
        orders: true,
        reviews: true,
        provider: true
      },
    });
  }

  async findOneByField(where: any) {
    return await this.prisma.user.findUnique({
      where
    });
  }

  async update(id: bigint, updateUserDto: UpdateUserDto) {
    const updateData = this.buildUserUpdateData(updateUserDto);

    if (!Object.keys(updateData).length) {
      throw new BadRequestException('No valid profile fields provided for update.');
    }

    return await this.prisma.user.update({
      where: { id },
      data: updateData,
    });
  }

  private buildUserUpdateData(updateUserDto: UpdateUserDto) {
    const data: any = {};

    if (updateUserDto.name !== undefined) {
      data.name = updateUserDto.name;
    }

    if (updateUserDto.email !== undefined) {
      new Email(updateUserDto.email);
      data.email = updateUserDto.email;
    }

    if (updateUserDto.phone !== undefined) {
      const phone = new Phone(updateUserDto.phone);
      data.phone = phone.getValue();
    }

    if (updateUserDto.photoUrl !== undefined) {
      data.photoUrl = updateUserDto.photoUrl;
    }

    if (updateUserDto.password !== undefined) {
      data.passwordHash = bcrypt.hashSync(updateUserDto.password, 8);
    }

    if (updateUserDto.cpf !== undefined) {
      data.cpf = updateUserDto.cpf;
    }

    if (updateUserDto.type !== undefined) {
      data.type = updateUserDto.type;
    }

    return data;
  }

  async requestEmailVerification(id: bigint, payload: RequestEmailVerificationDto) {
    new Email(payload.email);

    const user: any = await this.findOne(id);
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        pendingEmail: payload.email,
        emailVerified: false,
      } as any,
    });

    await this.userVerificationService.requestEmailVerification(id, payload.email);
    return updatedUser;
  }

  async confirmEmailVerification(id: bigint, payload: ConfirmEmailVerificationDto) {
    const user: any = await this.findOne(id);
    if (!user || !user.pendingEmail) {
      throw new BadRequestException('No pending email verification found for this user.');
    }

    const verified = await this.userVerificationService.verifyEmailCode(id, payload.verificationCode);
    if (!verified) {
      throw new BadRequestException('Invalid verification code.');
    }

    return await this.prisma.user.update({
      where: { id },
      data: {
        email: user.pendingEmail,
        pendingEmail: null,
        emailVerified: true,
      } as any,
    });
  }

  async requestPhoneVerification(id: bigint, payload: RequestPhoneVerificationDto) {
    const phone = new Phone(payload.phone);

    const user: any = await this.findOne(id);
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        pendingPhone: phone.getValue(),
        phoneVerified: false,
      } as any,
    });

    await this.userVerificationService.requestPhoneVerification(id, payload.phone);
    return updatedUser;
  }

  async confirmPhoneVerification(id: bigint, payload: ConfirmPhoneVerificationDto) {
    const user: any = await this.findOne(id);
    if (!user || !user.pendingPhone) {
      throw new BadRequestException('No pending phone verification found for this user.');
    }

    const verified = await this.userVerificationService.verifyPhoneCode(id, payload.verificationCode);
    if (!verified) {
      throw new BadRequestException('Invalid verification code.');
    }

    return await this.prisma.user.update({
      where: { id },
      data: {
        phone: user.pendingPhone,
        pendingPhone: null,
        phoneVerified: true,
      } as any,
    });
  }

  async remove(id: bigint) {
    return await this.prisma.user.delete({
      where: { id },
    });
  }
}
