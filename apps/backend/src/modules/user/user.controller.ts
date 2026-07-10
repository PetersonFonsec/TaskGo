import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { plainToClass } from 'class-transformer';
import type { PublicUserProfile } from '@taskgo/shared';
import { Public } from '../../shared/decorators/public.decorator';

import { PaginationQuery } from '../../shared/services/pagination/pagination.interface';
import { CreateUserCommand } from './commands/create-user/create-user.command';
import { GetUserQuery } from './queries/get-user/get-user.query';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { RequestEmailVerificationDto } from './dto/request-email-verification.dto';
import { RequestPhoneVerificationDto } from './dto/request-phone-verification.dto';
import { ConfirmEmailVerificationDto } from './dto/confirm-email-verification.dto';
import { ConfirmPhoneVerificationDto } from './dto/confirm-phone-verification.dto';
import { UserService } from './user.service';
import { toPublicUserProfile } from './mappers/public-user-profile.mapper';
@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus
  ) {}

  @Public()
  @Post()
  async create(@Body() createUserDto: CreateUserDto) {
    const command = plainToClass(CreateUserCommand, createUserDto);
    const id = await this.commandBus.execute(command);
    return { id };
  }

  @Get()
  findAll(@Query() query: PaginationQuery) {
    return this.userService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<PublicUserProfile> {
    const query = plainToClass(GetUserQuery, { id: BigInt(id) });
    return await this.queryBus.execute(query);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto): Promise<PublicUserProfile> {
    const user = await this.userService.update(BigInt(id), updateUserDto);
    return toPublicUserProfile(user);
  }

  @Post(':id/verify-email')
  requestEmailVerification(@Param('id') id: string, @Body() payload: RequestEmailVerificationDto) {
    return this.userService.requestEmailVerification(BigInt(id), payload);
  }

  @Post(':id/verify-phone')
  requestPhoneVerification(@Param('id') id: string, @Body() payload: RequestPhoneVerificationDto) {
    return this.userService.requestPhoneVerification(BigInt(id), payload);
  }

  @Post(':id/confirm-email')
  confirmEmailVerification(@Param('id') id: string, @Body() payload: ConfirmEmailVerificationDto) {
    return this.userService.confirmEmailVerification(BigInt(id), payload);
  }

  @Post(':id/confirm-phone')
  confirmPhoneVerification(@Param('id') id: string, @Body() payload: ConfirmPhoneVerificationDto) {
    return this.userService.confirmPhoneVerification(BigInt(id), payload);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userService.remove(BigInt(id));
  }
}
