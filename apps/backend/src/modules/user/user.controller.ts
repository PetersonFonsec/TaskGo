import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ForbiddenException,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { plainToClass } from 'class-transformer';
import type { PublicUserProfile } from '@taskgo/shared';
import { User } from '../../shared/decorators/user.decorator';
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
import { ParseBigIntPipe } from '../../shared/pipes/parse-bigint.pipe';
@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  @Public()
  @Post()
  async create(@Body() createUserDto: CreateUserDto) {
    const command = plainToClass(CreateUserCommand, createUserDto);
    const id = await this.commandBus.execute(command);
    return { id };
  }

  @Get()
  findAll(@Query() _query: PaginationQuery) {
    throw new ForbiddenException('User directory is not available');
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseBigIntPipe) id: bigint,
    @User('id') actorId?: string,
  ): Promise<PublicUserProfile> {
    this.assertOwner(id, actorId);
    const query = plainToClass(GetUserQuery, { id });
    return await this.queryBus.execute(query);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseBigIntPipe) id: bigint,
    @Body() updateUserDto: UpdateUserDto,
    @User('id') actorId?: string,
  ): Promise<PublicUserProfile> {
    this.assertOwner(id, actorId);
    const user = await this.userService.update(id, updateUserDto);
    return toPublicUserProfile(user);
  }

  @Post(':id/verify-email')
  async requestEmailVerification(
    @Param('id', ParseBigIntPipe) id: bigint,
    @Body() payload: RequestEmailVerificationDto,
    @User('id') actorId?: string,
  ) {
    this.assertOwner(id, actorId);
    await this.userService.requestEmailVerification(id, payload);
    return { success: true };
  }

  @Post(':id/verify-phone')
  async requestPhoneVerification(
    @Param('id', ParseBigIntPipe) id: bigint,
    @Body() payload: RequestPhoneVerificationDto,
    @User('id') actorId?: string,
  ) {
    this.assertOwner(id, actorId);
    await this.userService.requestPhoneVerification(id, payload);
    return { success: true };
  }

  @Post(':id/confirm-email')
  async confirmEmailVerification(
    @Param('id', ParseBigIntPipe) id: bigint,
    @Body() payload: ConfirmEmailVerificationDto,
    @User('id') actorId?: string,
  ) {
    this.assertOwner(id, actorId);
    await this.userService.confirmEmailVerification(id, payload);
    return { success: true };
  }

  @Post(':id/confirm-phone')
  async confirmPhoneVerification(
    @Param('id', ParseBigIntPipe) id: bigint,
    @Body() payload: ConfirmPhoneVerificationDto,
    @User('id') actorId?: string,
  ) {
    this.assertOwner(id, actorId);
    await this.userService.confirmPhoneVerification(id, payload);
    return { success: true };
  }

  @Delete(':id')
  async remove(
    @Param('id', ParseBigIntPipe) id: bigint,
    @User('id') actorId?: string,
  ) {
    this.assertOwner(id, actorId);
    throw new ForbiddenException(
      'Account deletion requires the account closure process',
    );
  }
  private assertOwner(id: bigint, actorId?: string) {
    if (!actorId || id.toString() !== actorId) {
      throw new ForbiddenException('You can only access your own account');
    }
  }
}
